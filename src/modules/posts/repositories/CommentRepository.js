const { getPrismaClient } = require('../../../config/database');

// Comment Repository
class CommentRepository {
  constructor() {
    this.prisma = getPrismaClient();
  }

  async create(data) {
    return this.prisma.comment.create({
      data,
      include: {
        user: { select: { id: true, name: true } },
        post: { select: { id: true } },
      },
    });
  }

  async findByPostId(postId) {
    return this.prisma.comment.findMany({
      where: { postId },
      include: {
        user: { select: { id: true, name: true } },
      },
    });
  }

  async delete(id) {
    return this.prisma.comment.delete({
      where: { id },
    });
  }
}

module.exports = CommentRepository;
