// Devotional Controller
class DevotionalController {
  constructor(devotionalService) {
    this.devotionalService = devotionalService;
  }

  async createDevotional(req, res, next) {
    try {
      const CreateDevotionalDto = require('../dtos/CreateDevotionalDto');
      const dto = new CreateDevotionalDto({
        title: req.body.title,
        content: req.body.content,
        verse: req.body.verse,
        userId: req.user.id,
        churchId: req.user.churchId,
      });

      dto.validate();

      const devotional = await this.devotionalService.createDevotional(dto);

      res.status(201).json({
        success: true,
        message: 'Devotional created successfully',
        data: devotional,
      });
    } catch (error) {
      next(error);
    }
  }

  async getAllDevotionals(req, res, next) {
    try {
      const devotionals = await this.devotionalService.getAllDevotionals(
        req.user.churchId
      );

      res.status(200).json({
        success: true,
        message: 'Devotionals retrieved successfully',
        data: devotionals,
      });
    } catch (error) {
      next(error);
    }
  }

  async markAsInactive(req, res, next) {
    try {
      const { id } = req.params;

      const devotional = await this.devotionalService.markAsInactive(id);

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
      const { id } = req.params;

      const devotional = await this.devotionalService.reactivateDevotional(id);

      res.status(200).json({
        success: true,
        message: 'Devocional reativado com sucesso',
        data: devotional,
      });
    } catch (error) {
      next(error);
    }
  }
}

module.exports = DevotionalController;
