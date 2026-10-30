const { getPrismaClient } = require('../../../config/database');

// Post Repository
class PostRepository {
  constructor() {
    this.prisma = getPrismaClient();
  }

  postInclude() {
    return {
      user: { select: { id: true, name: true, profileImage: true } },
      comments: { include: { user: { select: { id: true, name: true, profileImage: true } } }, orderBy: { createdAt: 'asc' } },
      reactions: { select: { id: true, type: true, userId: true } },
    };
  }

  async create(data) {
    return this.prisma.post.create({ data, include: this.postInclude() });
  }

  async findAll(churchId) {
    return this.prisma.post.findMany({
      where: { churchId },
      include: this.postInclude(),
      orderBy: [{ isPinned: 'desc' }, { createdAt: 'desc' }],
    });
  }

  async findById(id) {
    return this.prisma.post.findUnique({ where: { id }, include: this.postInclude() });
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
