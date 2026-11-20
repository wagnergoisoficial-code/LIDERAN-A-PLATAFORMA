class NotificationService {
  constructor(notificationRepository) {
    this.notificationRepository = notificationRepository;
  }

  async getNotifications(userId) {
    return this.notificationRepository.findByUser(userId);
  }

  async getUnreadCount(userId) {
    return this.notificationRepository.countUnread(userId);
  }

  async markRead(id, userId) {
    return this.notificationRepository.markRead(id, userId);
  }

  async markAllRead(userId) {
    return this.notificationRepository.markAllRead(userId);
  }

  async create(data) {
    return this.notificationRepository.create(data);
  }

  async createForChurch(churchUsers, type, title, body, linkId, linkType) {
    const notifications = churchUsers.map(userId => ({ type, title, body, linkId, linkType, userId }));
    return this.notificationRepository.createMany(notifications);
  }
}

module.exports = NotificationService;
