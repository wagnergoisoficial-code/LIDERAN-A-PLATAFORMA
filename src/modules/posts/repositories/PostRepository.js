const { getPrismaClient } = require('../../../config/database');

class PostRepository {
  constructor() {
    this.prisma = getPrismaClient();
  }

  postInclude(hiddenUserIds = []) {
    const visible = hiddenUserIds.length ? { userId: { notIn: hiddenUserIds } } : undefined;
    return {
      user: { select: { id: true, name: true, profileImage: true } },
      comments: {
        where: visible,
        include: { user: { select: { id: true, name: true, profileImage: true } } },
        orderBy: { createdAt: 'asc' },
      },
      reactions: { select: { id: true, type: true, userId: true } },
      church: { select: { id: true, name: true } },
    };
  }

  // Utilizadores que este utilizador bloqueou (conteúdo deles fica oculto)
  async blockedIds(userId) {
    const rows = await this.prisma.blockedUser.findMany({
      where: { blockerId: userId },
      select: { blockedId: true },
    });
    return rows.map((r) => r.blockedId);
  }

  async create(data) {
    return this.prisma.post.create({ data, include: this.postInclude() });
  }

  // O feed de uma comunidade: as publicações dela e as doações de todas as comunidades
  // Líderes da comunidade: o criador e quem tem o papel de líder
  async leaderIds(churchId) {
    const [church, leaders] = await Promise.all([
      this.prisma.church.findUnique({ where: { id: churchId }, select: { leaderID: true } }),
      this.prisma.user.findMany({ where: { churchId, role: { in: ['leader', 'admin'] } }, select: { id: true } }),
    ]);
    return [...new Set([church?.leaderID, ...leaders.map((l) => l.id)].filter(Boolean))];
  }

  // Membros ativos com data de nascimento, para os avisos de aniversário
  async birthdayMembers(churchId) {
    return this.prisma.user.findMany({
      where: { churchId, status: 'active', birthDate: { not: null } },
      select: { id: true, name: true, birthDate: true, birthdayNoticeYear: true },
    });
  }

  // Um aviso por pessoa e por ano: quem marca o ano primeiro publica (pedidos em paralelo não duplicam,
  // e apagar a publicação não a faz voltar)
  async createBirthdayPost({ userId, churchId, year, content }) {
    return this.prisma.$transaction(async (tx) => {
      const { count } = await tx.user.updateMany({
        where: { id: userId, OR: [{ birthdayNoticeYear: null }, { birthdayNoticeYear: { lt: year } }] },
        data: { birthdayNoticeYear: year },
      });
      if (count) await tx.post.create({ data: { type: 'birthday', content, userId, churchId } });
    });
  }

  // No topo do feed: fixadas, o que a liderança publicou nos últimos 7 dias e os aniversários recentes
  topWhere(leaderIds) {
    const ago = (days) => new Date(Date.now() - days * 24 * 60 * 60 * 1000);
    return {
      OR: [
        { isPinned: true },
        { userId: { in: leaderIds }, createdAt: { gte: ago(7) } },
        { type: 'birthday', createdAt: { gte: ago(2) } },
      ],
    };
  }

  async findPage(churchId, hiddenUserIds = [], { cursor, limit = 20, leaderIds = [] } = {}) {
    const notHidden = hiddenUserIds.length ? { userId: { notIn: hiddenUserIds } } : {};
    const top = this.topWhere(leaderIds);

    const pinned = cursor
      ? []
      : await this.prisma.post.findMany({
          where: { ...notHidden, churchId, ...top },
          include: this.postInclude(hiddenUserIds),
          orderBy: [{ isPinned: 'desc' }, { createdAt: 'desc' }],
          take: 30,
        });

    const regular = await this.prisma.post.findMany({
      where: {
        ...notHidden,
        OR: [{ churchId, NOT: top }, { type: 'donation', churchId: { not: churchId } }],
      },
      include: this.postInclude(hiddenUserIds),
      orderBy: [{ createdAt: 'desc' }, { id: 'desc' }],
      take: limit + 1,
      ...(cursor && { cursor: { id: cursor }, skip: 1 }),
    });

    const hasMore = regular.length > limit;
    const page = hasMore ? regular.slice(0, limit) : regular;
    return { posts: [...pinned.map((p) => ({ ...p, top: true })), ...page], nextCursor: hasMore ? page[page.length - 1].id : null };
  }

  async findById(id, hiddenUserIds = []) {
    return this.prisma.post.findUnique({ where: { id }, include: this.postInclude(hiddenUserIds) });
  }

  async update(id, data) {
    return this.prisma.post.update({ where: { id }, data });
  }

  async delete(id) {
    return this.prisma.post.delete({ where: { id } });
  }

  async togglePin(id, isPinned) {
    return this.prisma.post.update({ where: { id }, data: { isPinned } });
  }

  async countUserReactions(postId, userId) {
    return this.prisma.postReaction.count({ where: { postId, userId } });
  }

  async upsertReaction(postId, userId, type) {
    return this.prisma.postReaction.upsert({
      where: { postId_userId_type: { postId, userId, type } },
      update: {},
      create: { postId, userId, type },
    });
  }

  async deleteReaction(postId, userId, type) {
    return this.prisma.postReaction.deleteMany({ where: { postId, userId, type } });
  }
}

module.exports = PostRepository;
