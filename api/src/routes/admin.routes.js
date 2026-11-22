const express = require('express');
const authMiddleware = require('../shared/middlewares/auth.middleware');
const roleMiddleware = require('../shared/middlewares/role.middleware');
const { getPrismaClient } = require('../config/database');
const { textContains } = require('../shared/utils/query.util');
const { notifyUser } = require('../shared/utils/notifier');
const { NotFoundError, ForbiddenError, ValidationError } = require('../shared/errors/AppError');

// Administração da plataforma: só o administrador (role admin) entra
const router = express.Router();
const handle = (fn) => async (req, res, next) => {
  try {
    await fn(req, res);
  } catch (error) {
    next(error);
  }
};

const PERSON = { id: true, name: true, email: true, role: true, status: true, profileImage: true, createdAt: true, leaderVerifiedAt: true };
const PAGE_SIZE = 50;

router.use(authMiddleware, roleMiddleware('admin'));

// Números da plataforma, pedidos de líder à espera e os cadastros mais recentes
router.get('/overview', handle(async (req, res) => {
  const prisma = getPrismaClient();
  const weekAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
  const [people, peopleWeek, roles, verifiedLeaders, churches, posts, postsWeek, prayers, events, pendingCount, openReports, pending, recent] =
    await Promise.all([
      prisma.user.count(),
      prisma.user.count({ where: { createdAt: { gte: weekAgo } } }),
      prisma.user.groupBy({ by: ['role'], _count: { _all: true } }),
      prisma.user.count({ where: { role: 'leader', leaderVerifiedAt: { not: null } } }),
      prisma.church.count(),
      prisma.post.count(),
      prisma.post.count({ where: { createdAt: { gte: weekAgo } } }),
      prisma.prayerRequest.count(),
      prisma.event.count({ where: { startDate: { gte: new Date() } } }),
      prisma.leaderVerification.count({ where: { status: 'pending' } }),
      prisma.report.count({ where: { status: 'open' } }),
      prisma.leaderVerification.findMany({
        where: { status: 'pending' },
        orderBy: { submittedAt: 'asc' },
        take: 6,
        select: { id: true, churchName: true, position: true, city: true, country: true, submittedAt: true, user: { select: { name: true, email: true } } },
      }),
      prisma.user.findMany({ orderBy: { createdAt: 'desc' }, take: 8, select: { ...PERSON, church: { select: { name: true } } } }),
    ]);

  const byRole = Object.fromEntries(roles.map((r) => [r.role, r._count._all]));
  res.json({
    success: true,
    data: {
      counts: {
        people, peopleWeek, leaders: byRole.leader || 0, verifiedLeaders, members: byRole.member || 0,
        churches, posts, postsWeek, prayers, events, pendingVerifications: pendingCount, openReports,
      },
      pending,
      recent,
    },
  });
}));

// Todas as comunidades, com o líder e o tamanho
router.get('/churches', handle(async (req, res) => {
  const prisma = getPrismaClient();
  const churches = await prisma.church.findMany({
    orderBy: { createdAt: 'desc' },
    select: { id: true, name: true, createdAt: true, leaderID: true, _count: { select: { users: true, posts: true } } },
  });
  const leaderIds = [...new Set(churches.map((c) => c.leaderID).filter(Boolean))];
  const leaders = await prisma.user.findMany({ where: { id: { in: leaderIds } }, select: { id: true, name: true, email: true } });
  const leaderById = new Map(leaders.map((l) => [l.id, l]));
  res.json({
    success: true,
    data: churches.map(({ leaderID, _count, ...church }) => ({
      ...church, leader: leaderById.get(leaderID) || null, members: _count.users, posts: _count.posts,
    })),
  });
}));

// Pessoas da plataforma: busca por nome ou e-mail, 50 de cada vez
router.get('/users', handle(async (req, res) => {
  const prisma = getPrismaClient();
  const q = String(req.query.q || '').trim().slice(0, 80);
  const page = Math.max(1, parseInt(req.query.page, 10) || 1);
  const where = q ? { OR: [{ name: textContains(q) }, { email: textContains(q) }] } : {};
  const [total, users] = await Promise.all([
    prisma.user.count({ where }),
    prisma.user.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      skip: (page - 1) * PAGE_SIZE,
      take: PAGE_SIZE,
      select: { ...PERSON, church: { select: { name: true } } },
    }),
  ]);
  res.json({ success: true, data: { users, total, page, pageSize: PAGE_SIZE } });
}));

// A pessoa a quem o administrador se dirige (o próprio administrador fica de fora)
const findTarget = async (prisma, id) => {
  const target = await prisma.user.findUnique({ where: { id }, select: { ...PERSON, churchId: true } });
  if (!target) throw new NotFoundError('Pessoa não encontrada');
  if (target.role === 'admin') throw new ForbiddenError('O administrador não pode ser alterado por aqui');
  return target;
};

const cleanText = (value, max) => (typeof value === 'string' ? value.trim().slice(0, max) : '');

// Mensagem da administração: chega como notificação, com o texto inteiro
router.post('/users/:id/message', handle(async (req, res) => {
  const prisma = getPrismaClient();
  const target = await findTarget(prisma, req.params.id);
  const text = cleanText(req.body?.text, 500);
  if (!text) throw new ValidationError('Escreva a mensagem');
  await prisma.notification.create({
    data: { userId: target.id, type: 'admin_message', title: 'Mensagem da administração da Fourux', body: text },
  });
  res.status(201).json({ success: true, message: `Mensagem enviada a ${target.name}` });
}));

// Mesmas durações das suspensões feitas pelas comunidades
const SUSPENSION_DAYS = [1, 3, 7, 15, 30, 90];

// Suspender, bloquear, reativar ou retirar a verificação de líder. Fica registado para auditoria.
router.post('/users/:id/moderation', handle(async (req, res) => {
  const prisma = getPrismaClient();
  const target = await findTarget(prisma, req.params.id);
  const { action, days } = req.body || {};
  const reason = cleanText(req.body?.reason, 500) || null;
  let data;
  let until = null;
  let notice = null;

  if (action === 'suspend') {
    const n = parseInt(days, 10);
    if (!SUSPENSION_DAYS.includes(n)) throw new ValidationError(`Escolha a duração da suspensão: ${SUSPENSION_DAYS.join(', ')} dias`);
    until = new Date(Date.now() + n * 24 * 60 * 60 * 1000);
    data = { status: 'suspended', suspendedUntil: until, statusReason: reason };
  } else if (action === 'block') {
    data = { status: 'blocked', suspendedUntil: null, statusReason: reason };
  } else if (action === 'reactivate') {
    if (target.status === 'pending_authorization') {
      throw new ValidationError('Este menor aguarda a autorização dos pais: a comunidade confirma a autorização');
    }
    data = { status: 'active', suspendedUntil: null, statusReason: null };
    notice = { type: 'account_reactivated', title: 'A sua conta foi reativada', body: 'Já pode usar a Fourux de novo.' };
  } else if (action === 'revoke_verification') {
    if (target.role !== 'leader' || !target.leaderVerifiedAt) throw new ValidationError('Esta pessoa não é um líder verificado');
    if (!reason) throw new ValidationError('Indique o motivo');
    data = { leaderVerifiedAt: null };
    notice = { type: 'verification_rejected', title: 'Verificação de líder retirada', body: reason };
  } else {
    throw new ValidationError('Ação inválida');
  }

  const [updated] = await prisma.$transaction([
    prisma.user.update({ where: { id: target.id }, data, select: { ...PERSON, church: { select: { name: true } } } }),
    prisma.moderationAction.create({
      data: { action, reason, until, churchId: target.churchId || null, userId: target.id, actorId: req.user.id },
    }),
    // O pedido aprovado passa a recusado, com o motivo: o líder pode enviar um novo
    ...(action === 'revoke_verification'
      ? [prisma.leaderVerification.updateMany({
          where: { userId: target.id },
          data: { status: 'rejected', reason, reviewedAt: new Date(), reviewedById: req.user.id },
        })]
      : []),
  ]);

  if (notice) await notifyUser(target.id, notice);
  res.json({ success: true, data: updated });
}));

module.exports = router;
