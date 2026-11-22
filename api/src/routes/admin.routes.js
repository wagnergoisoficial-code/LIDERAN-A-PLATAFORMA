const express = require('express');
const authMiddleware = require('../shared/middlewares/auth.middleware');
const roleMiddleware = require('../shared/middlewares/role.middleware');
const { getPrismaClient } = require('../config/database');
const { textContains } = require('../shared/utils/query.util');

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

module.exports = router;
