const { getPrismaClient } = require('../../../config/database');

class CommentRepository {
  constructor() {
    this.prisma = getPrismaClient();
  }

  async create(data) {
    return this.prisma.comment.create({
      data,
      include: {
        user: { select: { id: true, name: true, profileImage: true } },
      },
    });
  }

  async findById(id) {
    return this.prisma.comment.findUnique({
      where: { id },
      include: { post: { select: { id: true, churchId: true } } },
    });
  }

  async findByPostId(postId) {
    return this.prisma.comment.findMany({
      where: { postId },
      include: {
        user: { select: { id: true, name: true, profileImage: true } },
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
