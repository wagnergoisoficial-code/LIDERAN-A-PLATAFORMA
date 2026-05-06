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

  async getMemberStats(req, res, next) {
    try {
      const { churchId } = req.params;
      const stats = await ChurchService.getMemberStats(churchId);
      res.status(200).json({ success: true, data: stats });
    } catch (error) {
      next(error);
    }
  }

  async removeMemberFromChurch(req, res, next) {
    try {
      const { churchId, memberId } = req.params;
      const leaderId = req.user.id;

      await ChurchService.removeMemberFromChurch(memberId, churchId, leaderId);

      res.status(200).json({
        success: true,
        message: 'Member removed from church successfully',
      });
    } catch (error) {
      next(error);
    }
  }

  async updateMember(req, res, next) {
    try {
      const { churchId, memberId } = req.params;
      const { name, title, location, age } = req.body;
      const leaderId = req.user.id;

      const member = await ChurchService.updateMember(
        memberId,
        churchId,
        { name, title, location, age: age ? parseInt(age) : undefined },
        leaderId
      );

      res.status(200).json({
        success: true,
        message: 'Member updated successfully',
        data: member,
      });
    } catch (error) {
      next(error);
    }
  }
}

module.exports = new ChurchController();
