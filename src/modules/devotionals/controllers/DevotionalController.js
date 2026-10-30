const CreateDevotionalDto = require('../dtos/CreateDevotionalDto');

class DevotionalController {
  constructor(devotionalService) {
    this.devotionalService = devotionalService;
  }

  async createDevotional(req, res, next) {
    try {
      const dto = new CreateDevotionalDto(req.body);
      dto.validate();

      const devotional = await this.devotionalService.createDevotional(dto, req.user);

      res.status(201).json({
        success: true,
        message: 'Devocional publicado',
        data: devotional,
      });
    } catch (error) {
      next(error);
    }
  }

  async getAllDevotionals(req, res, next) {
    try {
      const devotionals = await this.devotionalService.getAllDevotionals(req.user);
      res.status(200).json({ success: true, data: devotionals });
    } catch (error) {
      next(error);
    }
  }

  async markAsInactive(req, res, next) {
    try {
      const devotional = await this.devotionalService.markAsInactive(req.params.id, req.user);

      res.status(200).json({
        success: true,
        message: 'Devocional marcado como inativo',
        data: devotional,
      });
    } catch (error) {
      next(error);
    }
  }

  async reactivateDevotional(req, res, next) {
    try {
      const devotional = await this.devotionalService.reactivateDevotional(req.params.id, req.user);

      res.status(200).json({
        success: true,
        message: 'Devocional reativado com sucesso',
        data: devotional,
      });
    } catch (error) {
      next(error);
    }
  }

  async deleteDevotional(req, res, next) {
    try {
      await this.devotionalService.deleteDevotional(req.params.id, req.user);
      res.status(200).json({ success: true, message: 'Devocional excluído' });
    } catch (error) {
      next(error);
    }
  }

  async toggleLike(req, res, next) {
    try {
      const result = await this.devotionalService.toggleLike(req.params.id, req.user);
      res.status(200).json({ success: true, data: result });
    } catch (error) {
      next(error);
    }
  }
}

module.exports = DevotionalController;
