class SermonController {
  constructor(service) { this.service = service; }

  async getAll(req, res, next) {
    try {
      const sermons = await this.service.getSermons(req.user);
      res.json({ success: true, data: sermons });
    } catch (e) { next(e); }
  }

  async create(req, res, next) {
    try {
      const sermon = await this.service.createSermon(req.body, req.user);
      res.status(201).json({ success: true, message: 'Pregação publicada', data: sermon });
    } catch (e) { next(e); }
  }

  async getById(req, res, next) {
    try {
      const sermon = await this.service.getSermonById(req.params.id, req.user);
      res.json({ success: true, data: sermon });
    } catch (e) { next(e); }
  }

  async update(req, res, next) {
    try {
      const sermon = await this.service.updateSermon(req.params.id, req.body, req.user);
      res.json({ success: true, message: 'Pregação atualizada', data: sermon });
    } catch (e) { next(e); }
  }

  async remove(req, res, next) {
    try {
      await this.service.deleteSermon(req.params.id, req.user);
      res.json({ success: true, message: 'Pregação excluída' });
    } catch (e) { next(e); }
  }
}

module.exports = SermonController;
