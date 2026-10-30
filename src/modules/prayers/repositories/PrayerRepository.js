const { getPrismaClient } = require('../../../config/database');

class PrayerRepository {
  constructor() {
    this.prisma = getPrismaClient();
  }

  async create(data) {
    return this.prisma.prayerRequest.create({ data });
  }

  async findAll(churchId) {
    return this.prisma.prayerRequest.findMany({
      where: { churchId },
      include: {
        prayers: { include: { user: { select: { id: true, name: true } } } },
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  async findById(id) {
    return this.prisma.prayerRequest.findUnique({
      where: { id },
      include: { prayers: { include: { user: { select: { id: true, name: true, profileImage: true } } } } },
    });
  }

  async update(id, data) {
    return this.prisma.prayerRequest.update({ where: { id }, data });
  }

  async delete(id) {
    return this.prisma.prayerRequest.delete({ where: { id } });
  }

  async pray(prayerRequestId, userId) {
    return this.prisma.prayer.upsert({
      where: { prayerRequestId_userId: { prayerRequestId, userId } },
      update: {},
      create: { prayerRequestId, userId },
    });
  }

  async unpray(prayerRequestId, userId) {
    return this.prisma.prayer.deleteMany({ where: { prayerRequestId, userId } });
  }
}

module.exports = PrayerRepository;
