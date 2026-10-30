class PrayerController {
  constructor(prayerService) {
    this.prayerService = prayerService;
  }

  // Pedidos anónimos não revelam o autor (só o próprio sabe que é seu: isMine)
  format(pr, userId) {
    const anonymous = pr.isAnonymous;
    return {
      id: pr.id,
      title: pr.title,
      content: pr.content,
      isAnonymous: anonymous,
      isAnswered: pr.isAnswered,
      userId: anonymous ? null : pr.userId,
      authorName: anonymous ? null : pr.author?.name || null,
      authorProfileImage: anonymous ? null : pr.author?.profileImage || null,
      isMine: pr.userId === userId,
      prayCount: pr.prayers?.length || 0,
      hasPrayed: pr.prayers?.some(p => p.userId === userId) || false,
      prayingNames: (pr.prayers || []).slice(0, 5).map(p => p.user?.name).filter(Boolean),
      createdAt: pr.createdAt,
    };
  }

  async create(req, res, next) {
    try {
      const pr = await this.prayerService.create(req.body, req.user);
      res.status(201).json({ success: true, message: 'Pedido de oração enviado', data: this.format(pr, req.user.id) });
    } catch (e) { next(e); }
  }

  async getAll(req, res, next) {
    try {
      const list = await this.prayerService.getAll(req.user);
      res.json({ success: true, data: list.map(pr => this.format(pr, req.user.id)) });
    } catch (e) { next(e); }
  }

  async markAnswered(req, res, next) {
    try {
      const pr = await this.prayerService.markAnswered(req.params.id, req.user);
      res.json({ success: true, message: 'Marcado como respondido', data: this.format(pr, req.user.id) });
    } catch (e) { next(e); }
  }

  async remove(req, res, next) {
    try {
      await this.prayerService.delete(req.params.id, req.user);
      res.json({ success: true, message: 'Pedido excluído' });
    } catch (e) { next(e); }
  }

  async pray(req, res, next) {
    try {
      const pr = await this.prayerService.pray(req.params.id, req.user);
      res.json({ success: true, message: 'Você está orando por este pedido', data: this.format(pr, req.user.id) });
    } catch (e) { next(e); }
  }

  async unpray(req, res, next) {
    try {
      const pr = await this.prayerService.unpray(req.params.id, req.user);
      res.json({ success: true, message: 'Oração removida', data: this.format(pr, req.user.id) });
    } catch (e) { next(e); }
  }
}

module.exports = PrayerController;
