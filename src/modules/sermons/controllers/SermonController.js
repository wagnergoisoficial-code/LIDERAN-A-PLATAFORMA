class SermonController {
  constructor(service) { this.service = service; }

  async getAll(req, res, next) {
    try {
      const { churchId } = req.user;
      if (!churchId) return res.json({ success: true, data: [] });
      const sermons = await this.service.getSermons(churchId);
      res.json({ success: true, data: sermons });
    } catch (e) { next(e); }
  }

  async create(req, res, next) {
    try {
      const { churchId, id: authorId, role } = req.user;
      if (!['leader', 'admin'].includes(role))
        return res.status(403).json({ success: false, message: 'Acesso negado' });
      const { title, speaker, content, scriptureRef, date } = req.body;
      const sermon = await this.service.createSermon({
        title, speaker, content,
        scriptureRef: scriptureRef || null,
        date: date ? new Date(date) : new Date(),
        churchId, authorId,
      });
      res.status(201).json({ success: true, data: sermon });
    } catch (e) { next(e); }
  }

  async getById(req, res, next) {
    try {
      const sermon = await this.service.getSermonById(req.params.id);
      if (!sermon) return res.status(404).json({ success: false, message: 'Não encontrado' });
      res.json({ success: true, data: sermon });
    } catch (e) { next(e); }
  }

  async update(req, res, next) {
    try {
      const { role } = req.user;
      if (!['leader', 'admin'].includes(role))
        return res.status(403).json({ success: false, message: 'Acesso negado' });
      const { title, speaker, content, scriptureRef, date } = req.body;
      const sermon = await this.service.updateSermon(req.params.id, {
        ...(title && { title }),
        ...(speaker && { speaker }),
        ...(content && { content }),
        ...(scriptureRef !== undefined && { scriptureRef }),
        ...(date && { date: new Date(date) }),
      });
      res.json({ success: true, data: sermon });
    } catch (e) { next(e); }
  }

  async remove(req, res, next) {
    try {
      const { role } = req.user;
      if (!['leader', 'admin'].includes(role))
        return res.status(403).json({ success: false, message: 'Acesso negado' });
      await this.service.deleteSermon(req.params.id);
      res.json({ success: true });
    } catch (e) { next(e); }
  }
}

module.exports = SermonController;
