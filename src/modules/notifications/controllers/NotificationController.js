class NotificationController {
  constructor(notificationService) {
    this.notificationService = notificationService;
  }

  async getAll(req, res, next) {
    try {
      const [notifications, unreadCount] = await Promise.all([
        this.notificationService.getNotifications(req.user.id),
        this.notificationService.getUnreadCount(req.user.id),
      ]);
      res.json({ success: true, data: { notifications, unreadCount } });
    } catch (e) { next(e); }
  }

  async markRead(req, res, next) {
    try {
      await this.notificationService.markRead(req.params.id, req.user.id);
      res.json({ success: true, message: 'Marked as read' });
    } catch (e) { next(e); }
  }

  async markAllRead(req, res, next) {
    try {
      await this.notificationService.markAllRead(req.user.id);
      res.json({ success: true, message: 'All marked as read' });
    } catch (e) { next(e); }
  }
}

module.exports = NotificationController;
