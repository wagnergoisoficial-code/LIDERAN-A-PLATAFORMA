const { getPrismaClient } = require('../../../config/database');

class EventRepository {
  constructor() {
    this.prisma = getPrismaClient();
  }

  async create(data) {
    return this.prisma.event.create({
      data,
      include: { attendances: { include: { user: { select: { id: true, name: true, profileImage: true } } } } },
    });
  }

  // Os 200 eventos mais recentes (inclui todos os próximos), em ordem cronológica
  async findAll(churchId) {
    const events = await this.prisma.event.findMany({
      where: { churchId },
      include: { attendances: { include: { user: { select: { id: true, name: true, profileImage: true } } } } },
      orderBy: { startDate: 'desc' },
      take: 200,
    });
    return events.reverse();
  }

  async findById(id) {
    return this.prisma.event.findUnique({
      where: { id },
      include: { attendances: { include: { user: { select: { id: true, name: true, profileImage: true } } } } },
    });
  }

  async update(id, data) {
    return this.prisma.event.update({ where: { id }, data });
  }

  async delete(id) {
    return this.prisma.event.delete({ where: { id } });
  }

  async upsertAttendance(eventId, userId, status) {
    return this.prisma.eventAttendance.upsert({
      where: { eventId_userId: { eventId, userId } },
      update: { status },
      create: { eventId, userId, status },
    });
  }

  async deleteAttendance(eventId, userId) {
    return this.prisma.eventAttendance.deleteMany({ where: { eventId, userId } });
  }
}

module.exports = EventRepository;
