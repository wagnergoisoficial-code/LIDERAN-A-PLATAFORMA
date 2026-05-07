const { getPrismaClient } = require('../../../config/database');

// Devotional Repository
class DevotionalRepository {
  constructor() {
    this.prisma = getPrismaClient();
  }

  async create(data) {
    return this.prisma.devotional.create({
      data,
      include: {
        user: { select: { id: true, name: true, profileImage: true } },
      },
    });
  }

  async findAll(churchId) {
    return this.prisma.devotional.findMany({
      where: { churchId },
      include: {
        user: { select: { id: true, name: true, profileImage: true } },
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  async findById(id) {
    return this.prisma.devotional.findUnique({
      where: { id },
      include: {
        user: { select: { id: true, name: true, profileImage: true } },
      },
    });
  }

  async update(id, data) {
    return this.prisma.devotional.update({
      where: { id },
      data,
      include: {
        user: { select: { id: true, name: true, profileImage: true } },
      },
    });
  }

  async delete(id) {
    return this.prisma.devotional.delete({
      where: { id },
    });
  }
}

module.exports = DevotionalRepository;
