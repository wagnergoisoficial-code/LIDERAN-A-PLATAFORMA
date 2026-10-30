const { getPrismaClient } = require('../../../config/database');

class SermonRepository {
  constructor() {
    this.prisma = getPrismaClient();
  }

  authorSelect() {
    return { author: { select: { id: true, name: true, profileImage: true } } };
  }

  async create(data) {
    return this.prisma.sermonNote.create({ data, include: this.authorSelect() });
  }

  async findAll(churchId) {
    return this.prisma.sermonNote.findMany({
      where: { churchId },
      include: this.authorSelect(),
      orderBy: { date: 'desc' },
      take: 200,
    });
  }

  async findById(id) {
    return this.prisma.sermonNote.findUnique({ where: { id }, include: this.authorSelect() });
  }

  async update(id, data) {
    return this.prisma.sermonNote.update({ where: { id }, data, include: this.authorSelect() });
  }

  async delete(id) {
    return this.prisma.sermonNote.delete({ where: { id } });
  }
}

module.exports = SermonRepository;
