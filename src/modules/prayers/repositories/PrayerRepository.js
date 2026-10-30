const { getPrismaClient } = require('../../../config/database');

const INCLUDE = {
  prayers: { include: { user: { select: { id: true, name: true, profileImage: true } } } },
};

class PrayerRepository {
  constructor() {
    this.prisma = getPrismaClient();
  }

  // PrayerRequest não tem relação com User no schema: os autores são carregados à parte
  async withAuthors(requests) {
    const list = Array.isArray(requests) ? requests : [requests];
    const ids = [...new Set(list.filter(Boolean).map((r) => r.userId))];
    const users = ids.length
      ? await this.prisma.user.findMany({
          where: { id: { in: ids } },
          select: { id: true, name: true, profileImage: true },
        })
      : [];
    const byId = Object.fromEntries(users.map((u) => [u.id, u]));
    const mapped = list.map((r) => (r ? { ...r, author: byId[r.userId] || null } : r));
    return Array.isArray(requests) ? mapped : mapped[0];
  }

  async create(data) {
    return this.withAuthors(await this.prisma.prayerRequest.create({ data, include: INCLUDE }));
  }

  async findAll(churchId) {
    const list = await this.prisma.prayerRequest.findMany({
      where: { churchId },
      include: INCLUDE,
      orderBy: { createdAt: 'desc' },
    });
    return this.withAuthors(list);
  }

  async findById(id) {
    const pr = await this.prisma.prayerRequest.findUnique({ where: { id }, include: INCLUDE });
    return pr ? this.withAuthors(pr) : null;
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

  async hasPrayed(prayerRequestId, userId) {
    const count = await this.prisma.prayer.count({ where: { prayerRequestId, userId } });
    return count > 0;
  }

  async unpray(prayerRequestId, userId) {
    return this.prisma.prayer.deleteMany({ where: { prayerRequestId, userId } });
  }
}

module.exports = PrayerRepository;
