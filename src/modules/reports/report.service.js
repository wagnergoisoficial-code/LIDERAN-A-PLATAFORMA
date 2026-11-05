const { getPrismaClient } = require('../../config/database');
const { NotFoundError, ValidationError, ForbiddenError } = require('../../shared/errors/AppError');
const { requireChurch, canManageChurch } = require('../../shared/utils/church.util');
const { isMinor } = require('../../shared/utils/minor.util');
const { notifyUsers } = require('../../shared/utils/notifier');

const TARGET_TYPES = ['conversation', 'community_chat', 'post', 'prayer_request', 'profile'];
const STATUSES = ['open', 'resolved', 'dismissed'];
const TYPE_LABELS = {
  conversation: 'uma conversa privada',
  community_chat: 'uma mensagem no chat da comunidade',
  post: 'uma publicação',
  prayer_request: 'um pedido de oração',
  profile: 'um perfil',
};
const USER_BRIEF = { id: true, name: true, profileImage: true, role: true, birthDate: true, age: true, status: true };
// Denúncias iguais seguidas não se repetem no painel do líder
const DEDUPE_MS = 10 * 60 * 1000;

const person = (u) => (u ? { id: u.id, name: u.name, role: u.role, isMinor: isMinor(u) } : null);

class ReportService {
  get prisma() {
    return getPrismaClient();
  }

  directMessages(conversationId, take = 300) {
    return this.prisma.directMessage
      .findMany({
        where: { conversationId },
        include: { sender: { select: USER_BRIEF } },
        orderBy: { createdAt: 'desc' },
        take,
      })
      .then((list) =>
        list.reverse().map((m) => ({
          id: m.id,
          sender: person(m.sender),
          content: m.content,
          createdAt: m.createdAt,
          deletedAt: m.deletedAt,
        }))
      );
  }

  // Cópia do que foi denunciado, tal como estava no momento da denúncia.
  // viewerIds: quem tem acesso à conversa (o próprio, ou os filhos de um responsável)
  async buildSnapshot(user, churchId, targetType, targetId, viewerIds = [user.id]) {
    const prisma = this.prisma;

    if (targetType === 'conversation') {
      const conversation = await prisma.conversation.findFirst({
        where: { id: targetId, churchId, participants: { some: { userId: { in: viewerIds } } } },
        include: { participants: { include: { user: { select: USER_BRIEF } } } },
      });
      if (!conversation) throw new NotFoundError('Conversa não encontrada');
      const other = conversation.participants.find((p) => !viewerIds.includes(p.userId))?.user;
      return {
        targetUserId: other?.id || null,
        snapshot: {
          kind: 'conversation',
          participants: conversation.participants.map((p) => person(p.user)),
          messages: await this.directMessages(conversation.id),
        },
      };
    }

    if (targetType === 'community_chat') {
      let reported = null;
      if (targetId && targetId !== churchId) {
        reported = await prisma.message.findFirst({ where: { id: targetId, churchId } });
        if (!reported) throw new NotFoundError('Mensagem não encontrada');
      }
      const recent = await prisma.message.findMany({
        where: { churchId },
        include: { user: { select: USER_BRIEF } },
        orderBy: { createdAt: 'desc' },
        take: 100,
      });
      return {
        targetUserId: reported?.userId || null,
        snapshot: {
          kind: 'community_chat',
          reportedMessageId: reported?.id || null,
          messages: recent.reverse().map((m) => ({
            id: m.id,
            sender: person(m.user),
            content: m.content,
            createdAt: m.createdAt,
            hiddenAt: m.hiddenAt,
          })),
        },
      };
    }

    if (targetType === 'post') {
      const post = await prisma.post.findFirst({
        where: { id: targetId, OR: [{ churchId }, { type: 'donation' }] },
        include: {
          user: { select: USER_BRIEF },
          comments: { include: { user: { select: USER_BRIEF } }, orderBy: { createdAt: 'asc' } },
        },
      });
      if (!post) throw new NotFoundError('Publicação não encontrada');
      return {
        churchId: post.churchId,
        targetUserId: post.userId,
        snapshot: {
          kind: 'post',
          post: { id: post.id, type: post.type, author: person(post.user), content: post.content, imageUrl: post.imageUrl, location: post.location, createdAt: post.createdAt },
          comments: post.comments.map((c) => ({ id: c.id, author: person(c.user), content: c.content, createdAt: c.createdAt })),
        },
      };
    }

    if (targetType === 'prayer_request') {
      const request = await prisma.prayerRequest.findFirst({ where: { id: targetId, churchId } });
      if (!request) throw new NotFoundError('Pedido de oração não encontrado');
      const author = await prisma.user.findUnique({ where: { id: request.userId }, select: USER_BRIEF });
      return {
        targetUserId: request.userId,
        snapshot: {
          kind: 'prayer_request',
          prayer: { id: request.id, author: person(author), title: request.title, content: request.content, createdAt: request.createdAt },
        },
      };
    }

    // Perfil: dados da pessoa, a conversa privada com quem denunciou e a atividade recente
    const target = await prisma.user.findFirst({
      where: { id: targetId, churchId },
      select: { ...USER_BRIEF, title: true, createdAt: true },
    });
    if (!target) throw new NotFoundError('Usuário não encontrado');
    if (target.id === user.id) throw new ValidationError('Você não pode denunciar o seu próprio perfil');

    const conversation = await prisma.conversation.findFirst({
      where: {
        churchId,
        AND: [{ participants: { some: { userId: user.id } } }, { participants: { some: { userId: target.id } } }],
      },
    });
    const [posts, chat] = await Promise.all([
      prisma.post.findMany({ where: { userId: target.id, churchId }, orderBy: { createdAt: 'desc' }, take: 10 }),
      prisma.message.findMany({ where: { userId: target.id, churchId }, orderBy: { createdAt: 'desc' }, take: 30 }),
    ]);

    return {
      targetUserId: target.id,
      snapshot: {
        kind: 'profile',
        user: { ...person(target), title: target.title, memberSince: target.createdAt },
        conversation: conversation ? { id: conversation.id, messages: await this.directMessages(conversation.id) } : null,
        recentPosts: posts.map((p) => ({ id: p.id, content: p.content, imageUrl: p.imageUrl, createdAt: p.createdAt })),
        recentChatMessages: chat.map((m) => ({ id: m.id, content: m.content, createdAt: m.createdAt, hiddenAt: m.hiddenAt })),
      },
    };
  }

  // Denúncia com um toque: vai direto para os líderes da comunidade
  async create(user, { targetType, targetId, details }) {
    if (!TARGET_TYPES.includes(targetType)) throw new ValidationError('Tipo de denúncia inválido');
    if (!targetId) throw new ValidationError('Indique o que está denunciando');
    const note = typeof details === 'string' ? details.trim().slice(0, 1000) : null;

    const { churchId, viewerIds } = user.role === 'guardian'
      ? await this.guardianScope(user, targetType, targetId)
      : { churchId: requireChurch(user), viewerIds: [user.id] };

    const recent = await this.prisma.report.findFirst({
      where: {
        reporterId: user.id,
        targetType,
        targetId,
        status: 'open',
        createdAt: { gt: new Date(Date.now() - DEDUPE_MS) },
      },
    });
    if (recent) {
      if (note) await this.prisma.report.update({ where: { id: recent.id }, data: { details: note } });
      return { id: recent.id, status: recent.status, duplicate: true };
    }

    const built = await this.buildSnapshot(user, churchId, targetType, targetId, viewerIds);
    const { targetUserId, snapshot } = built;
    // Conteúdo de outra comunidade (doações): a denúncia vai para quem a pode moderar
    const reportChurchId = built.churchId || churchId;

    const report = await this.prisma.report.create({
      data: {
        churchId: reportChurchId,
        reporterId: user.id,
        targetType,
        targetId,
        targetUserId,
        details: note || null,
        snapshot: JSON.stringify(snapshot),
      },
    });

    await this.notifyLeaders(reportChurchId, report, user, targetUserId);
    return { id: report.id, status: report.status, duplicate: false };
  }

  // O responsável não pertence a nenhuma comunidade: só denuncia conversas dos filhos,
  // e a denúncia vai para a comunidade onde a conversa aconteceu
  async guardianScope(user, targetType, targetId) {
    if (targetType !== 'conversation') {
      throw new ForbiddenError('Os responsáveis só podem denunciar conversas dos filhos');
    }
    const links = await this.prisma.guardianship.findMany({ where: { guardianId: user.id }, select: { minorId: true } });
    const viewerIds = links.map((l) => l.minorId);
    const conversation = await this.prisma.conversation.findFirst({
      where: { id: targetId, participants: { some: { userId: { in: viewerIds } } } },
      select: { churchId: true },
    });
    if (!conversation) throw new NotFoundError('Conversa não encontrada');
    return { churchId: conversation.churchId, viewerIds };
  }

  // Líderes da comunidade; se o denunciado for líder, também os administradores da plataforma
  async notifyLeaders(churchId, report, reporter, targetUserId) {
    const church = await this.prisma.church.findUnique({ where: { id: churchId }, select: { leaderID: true } });
    const leaders = await this.prisma.user.findMany({
      where: { OR: [{ id: church?.leaderID || undefined }, { churchId, role: 'leader' }] },
      select: { id: true },
    });
    let recipients = leaders.map((l) => l.id);

    if (targetUserId && recipients.includes(targetUserId)) {
      const admins = await this.prisma.user.findMany({ where: { role: 'admin' }, select: { id: true } });
      recipients = recipients.filter((id) => id !== targetUserId).concat(admins.map((a) => a.id));
    }

    await notifyUsers(
      recipients.filter((id) => id !== reporter.id),
      {
        type: 'report',
        title: 'Nova denúncia',
        body: `${reporter.name}${reporter.role === 'guardian' ? ' (responsável)' : ''} denunciou ${TYPE_LABELS[report.targetType]}`,
        linkId: report.id,
        linkType: 'report',
      }
    );
  }

  async findManageable(user, reportId) {
    const report = await this.prisma.report.findUnique({
      where: { id: reportId },
      include: {
        church: true,
        reporter: { select: USER_BRIEF },
        targetUser: { select: { ...USER_BRIEF, suspendedUntil: true } },
      },
    });
    if (!report) throw new NotFoundError('Denúncia não encontrada');
    if (!canManageChurch(user, report.church)) throw new NotFoundError('Denúncia não encontrada');
    return report;
  }

  formatSummary(report) {
    return {
      id: report.id,
      targetType: report.targetType,
      targetId: report.targetId,
      status: report.status,
      details: report.details,
      createdAt: report.createdAt,
      resolvedAt: report.resolvedAt,
      resolution: report.resolution,
      reporter: person(report.reporter),
      targetUser: report.targetUser
        ? { ...person(report.targetUser), status: report.targetUser.status, suspendedUntil: report.targetUser.suspendedUntil }
        : null,
    };
  }

  async list(user, { churchId, status } = {}) {
    const id = churchId || user.churchId;
    if (!id) return [];
    const church = await this.prisma.church.findUnique({ where: { id } });
    if (!church || !canManageChurch(user, church)) throw new ForbiddenError('Apenas os líderes desta comunidade veem as denúncias');

    const reports = await this.prisma.report.findMany({
      where: { churchId: id, ...(STATUSES.includes(status) && { status }) },
      include: {
        reporter: { select: USER_BRIEF },
        targetUser: { select: { ...USER_BRIEF, suspendedUntil: true } },
      },
      orderBy: { createdAt: 'desc' },
      take: 200,
    });
    return reports.map((r) => this.formatSummary(r));
  }

  async get(user, reportId) {
    const report = await this.findManageable(user, reportId);
    return { ...this.formatSummary(report), churchId: report.churchId, snapshot: JSON.parse(report.snapshot) };
  }

  async update(user, reportId, { status, resolution }) {
    if (!STATUSES.includes(status)) throw new ValidationError('Estado inválido');
    await this.findManageable(user, reportId);
    await this.prisma.report.update({
      where: { id: reportId },
      data: {
        status,
        resolution: typeof resolution === 'string' ? resolution.trim().slice(0, 1000) || null : null,
        resolvedById: status === 'open' ? null : user.id,
        resolvedAt: status === 'open' ? null : new Date(),
      },
    });
    return this.get(user, reportId);
  }

  async countOpen(user, churchId) {
    const id = churchId || user.churchId;
    if (!id) return 0;
    const church = await this.prisma.church.findUnique({ where: { id } });
    if (!church || !canManageChurch(user, church)) return 0;
    return this.prisma.report.count({ where: { churchId: id, status: 'open' } });
  }
}

ReportService.TARGET_TYPES = TARGET_TYPES;

module.exports = new ReportService();
