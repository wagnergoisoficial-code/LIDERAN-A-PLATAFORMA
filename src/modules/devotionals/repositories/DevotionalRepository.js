const { getPrismaClient } = require('../../../config/database');

const INCLUDE = {
  user: { select: { id: true, name: true, profileImage: true } },
  likes: { select: { userId: true } },
};

class DevotionalRepository {
  constructor() {
    this.prisma = getPrismaClient();
  }

  async create(data) {
    return this.prisma.devotional.create({ data, include: INCLUDE });
  }

  async findAll(churchId) {
    return this.prisma.devotional.findMany({
      where: { churchId },
      include: INCLUDE,
      orderBy: { createdAt: 'desc' },
      take: 100,
    });
  }

  async findById(id) {
    return this.prisma.devotional.findUnique({ where: { id }, include: INCLUDE });
  }

  async update(id, data) {
    return this.prisma.devotional.update({ where: { id }, data, include: INCLUDE });
  }

  async delete(id) {
    return this.prisma.devotional.delete({ where: { id } });
  }

  async toggleLike(devotionalId, userId) {
    const existing = await this.prisma.devotionalLike.findUnique({
      where: { devotionalId_userId: { devotionalId, userId } },
    });

    if (existing) {
      await this.prisma.devotionalLike.delete({ where: { id: existing.id } });
    } else {
      await this.prisma.devotionalLike.create({ data: { devotionalId, userId } });
    }

    const likeCount = await this.prisma.devotionalLike.count({ where: { devotionalId } });
    return { liked: !existing, likeCount };
  }
}

module.exports = DevotionalRepository;
