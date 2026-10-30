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

  async findPage(churchId, hiddenUserIds = [], { cursor, limit = 20 } = {}) {
    const visible = { churchId, ...(hiddenUserIds.length && { userId: { notIn: hiddenUserIds } }) };

    const pinned = cursor
      ? []
      : await this.prisma.post.findMany({
          where: { ...visible, isPinned: true },
          include: this.postInclude(hiddenUserIds),
          orderBy: { createdAt: 'desc' },
          take: 20,
        });

    const regular = await this.prisma.post.findMany({
      where: { ...visible, isPinned: false },
      include: this.postInclude(hiddenUserIds),
      orderBy: [{ createdAt: 'desc' }, { id: 'desc' }],
      take: limit + 1,
      ...(cursor && { cursor: { id: cursor }, skip: 1 }),
    });

    const hasMore = regular.length > limit;
    const page = hasMore ? regular.slice(0, limit) : regular;
    return { posts: [...pinned, ...page], nextCursor: hasMore ? page[page.length - 1].id : null };
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
