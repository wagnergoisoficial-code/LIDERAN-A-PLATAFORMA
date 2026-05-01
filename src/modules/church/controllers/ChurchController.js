const ChurchService = require('../services/ChurchService');

class ChurchController {
  async createChurch(req, res, next) {
    try {
      const { name, title, description, imageUrl, cultosDias } = req.body;
      const leaderId = req.user.id;

      const church = await ChurchService.createChurch(
        { name, title, description, imageUrl, cultosDias },
        leaderId
      );

      res.status(201).json({
        success: true,
        message: 'Church created successfully',
        data: church,
      });
    } catch (error) {
      next(error);
    }
  }

  async getChurch(req, res, next) {
    try {
      const { churchId } = req.params;

      const church = await ChurchService.getChurch(churchId);

      res.status(200).json({
        success: true,
        message: 'Church retrieved successfully',
        data: church,
      });
    } catch (error) {
      next(error);
    }
  }

  async getChurchesByLeader(req, res, next) {
    try {
      const leaderId = req.user.id;

      const churches = await ChurchService.getChurchesByLeader(leaderId);

      res.status(200).json({
        success: true,
        message: 'Churches retrieved successfully',
        data: churches,
      });
    } catch (error) {
      next(error);
    }
  }

  async updateChurch(req, res, next) {
    try {
      const { churchId } = req.params;
      const { name, title, description, imageUrl, cultosDias } = req.body;
      const leaderId = req.user.id;

      const church = await ChurchService.updateChurch(
        churchId,
        { name, title, description, imageUrl, cultosDias },
        leaderId
      );

      res.status(200).json({
        success: true,
        message: 'Church updated successfully',
        data: church,
      });
    } catch (error) {
      next(error);
    }
  }

  async deleteChurch(req, res, next) {
    try {
      const { churchId } = req.params;
      const leaderId = req.user.id;

      await ChurchService.deleteChurch(churchId, leaderId);

      res.status(200).json({
        success: true,
        message: 'Church deleted successfully',
      });
    } catch (error) {
      next(error);
    }
  }

  async getChurchMembers(req, res, next) {
    try {
      const { churchId } = req.params;

      const members = await ChurchService.getChurchMembers(churchId);

      res.status(200).json({
        success: true,
        message: 'Church members retrieved successfully',
        data: members,
      });
    } catch (error) {
      next(error);
    }
  }

  async addMemberToChurch(req, res, next) {
    try {
      const { churchId } = req.params;
      const { userId } = req.body;

      await ChurchService.addMemberToChurch(userId, churchId);

      res.status(200).json({
        success: true,
        message: 'Member added to church successfully',
      });
    } catch (error) {
      next(error);
    }
  }
}

module.exports = new ChurchController();
