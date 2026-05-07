const { getPrismaClient } = require('../../../config/database');

// Post Repository
class PostRepository {
  constructor() {
    this.prisma = getPrismaClient();
  }

  async create(data) {
    return this.prisma.post.create({
      data,
      include: {
        user: {
          select: { id: true, name: true, email: true },
        },
      },
    });
  }

  async findAll(churchId) {
    return this.prisma.post.findMany({
      where: { churchId },
      include: {
        user: { select: { id: true, name: true, profileImage: true } },
        comments: { select: { id: true, content: true, user: { select: { name: true, profileImage: true } } } },
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  async findById(id) {
    return this.prisma.post.findUnique({
      where: { id },
      include: {
        user: { select: { id: true, name: true, profileImage: true } },
        comments: { include: { user: { select: { id: true, name: true, profileImage: true } } } },
      },
    });
  }

  async delete(id) {
    return this.prisma.post.delete({
      where: { id },
    });
  }
}

module.exports = PostRepository;
