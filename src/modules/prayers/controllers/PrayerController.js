class PrayerController {
  constructor(prayerService) {
    this.prayerService = prayerService;
  }

  format(pr, userId) {
    return {
      id: pr.id,
      title: pr.title,
      content: pr.content,
      isAnonymous: pr.isAnonymous,
      isAnswered: pr.isAnswered,
      userId: pr.isAnonymous ? null : pr.userId,
      prayCount: pr.prayers?.length || 0,
      hasPrayed: pr.prayers?.some(p => p.userId === userId) || false,
      createdAt: pr.createdAt,
    };
  }

  async create(req, res, next) {
    try {
      const pr = await this.prayerService.create({ ...req.body, userId: req.user.id, churchId: req.user.churchId });
      res.status(201).json({ success: true, data: this.format(pr, req.user.id) });
    } catch (e) { next(e); }
  }

  async getAll(req, res, next) {
    try {
      const list = await this.prayerService.getAll(req.user.churchId);
      res.json({ success: true, data: list.map(pr => this.format(pr, req.user.id)) });
    } catch (e) { next(e); }
  }

  async markAnswered(req, res, next) {
    try {
      await this.prayerService.markAnswered(req.params.id, req.user.id, req.user.role);
      res.json({ success: true, message: 'Marked as answered' });
    } catch (e) { next(e); }
  }

  async remove(req, res, next) {
    try {
      await this.prayerService.delete(req.params.id, req.user.id, req.user.role);
      res.json({ success: true, message: 'Deleted' });
    } catch (e) { next(e); }
  }

  async pray(req, res, next) {
    try {
      await this.prayerService.pray(req.params.id, req.user.id);
      res.json({ success: true, message: 'Praying' });
    } catch (e) { next(e); }
  }

  async unpray(req, res, next) {
    try {
      await this.prayerService.unpray(req.params.id, req.user.id);
      res.json({ success: true, message: 'Removed prayer' });
    } catch (e) { next(e); }
  }
}

module.exports = PrayerController;
