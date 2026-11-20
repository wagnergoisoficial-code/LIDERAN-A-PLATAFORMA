const { getPrismaClient } = require('../../../config/database');

class NotificationRepository {
  constructor() {
    this.prisma = getPrismaClient();
  }

  async create(data) {
    return this.prisma.notification.create({ data });
  }

  async createMany(notifications) {
    return this.prisma.notification.createMany({ data: notifications });
  }

  async findByUser(userId) {
    return this.prisma.notification.findMany({
      where: { userId },
      orderBy: { createdAt: 'desc' },
      take: 50,
    });
  }

  async countUnread(userId) {
    return this.prisma.notification.count({ where: { userId, isRead: false } });
  }

  async markRead(id, userId) {
    return this.prisma.notification.updateMany({ where: { id, userId }, data: { isRead: true } });
  }

  async markAllRead(userId) {
    return this.prisma.notification.updateMany({ where: { userId, isRead: false }, data: { isRead: true } });
  }

  async delete(id) {
    return this.prisma.notification.delete({ where: { id } });
  }
}

module.exports = NotificationRepository;
