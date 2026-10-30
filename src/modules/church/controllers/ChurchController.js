const ChurchService = require('../services/ChurchService');

class ChurchController {
  async createChurch(req, res, next) {
    try {
      const { name, title, description, imageUrl, cultosDias } = req.body;
      const { church, session } = await ChurchService.createChurch(
        { name, title, description, imageUrl, cultosDias },
        req.user
      );

      res.status(201).json({
        success: true,
        message: 'Comunidade criada com sucesso',
        data: church,
        session,
      });
    } catch (error) {
      next(error);
    }
  }

  async getChurch(req, res, next) {
    try {
      const church = await ChurchService.getChurch(req.params.churchId, req.user);
      res.status(200).json({ success: true, data: church });
    } catch (error) {
      next(error);
    }
  }

  async getChurchesByLeader(req, res, next) {
    try {
      const churches = await ChurchService.getChurchesByLeader(req.user);
      res.status(200).json({ success: true, data: churches });
    } catch (error) {
      next(error);
    }
  }

  async updateChurch(req, res, next) {
    try {
      const { name, title, description, imageUrl, cultosDias } = req.body;
      const church = await ChurchService.updateChurch(
        req.params.churchId,
        { name, title, description, imageUrl, cultosDias },
        req.user
      );

      res.status(200).json({
        success: true,
        message: 'Comunidade atualizada',
        data: church,
      });
    } catch (error) {
      next(error);
    }
  }

  async deleteChurch(req, res, next) {
    try {
      const { session } = await ChurchService.deleteChurch(req.params.churchId, req.user);

      res.status(200).json({
        success: true,
        message: 'Comunidade excluída',
        session,
      });
    } catch (error) {
      next(error);
    }
  }

  async activateChurch(req, res, next) {
    try {
      const { church, session } = await ChurchService.activateChurch(req.params.churchId, req.user);

      res.status(200).json({
        success: true,
        message: `${church.name} agora é a sua comunidade ativa`,
        data: church,
        session,
      });
    } catch (error) {
      next(error);
    }
  }

  async getChurchMembers(req, res, next) {
    try {
      const members = await ChurchService.getChurchMembers(req.params.churchId, req.user);
      res.status(200).json({ success: true, data: members });
    } catch (error) {
      next(error);
    }
  }

  async addMemberToChurch(req, res, next) {
    try {
      const member = await ChurchService.addMemberToChurch(req.body.userId, req.params.churchId, req.user);

      res.status(200).json({
        success: true,
        message: 'Membro adicionado à comunidade',
        data: member,
      });
    } catch (error) {
      next(error);
    }
  }

  async getMemberStats(req, res, next) {
    try {
      const stats = await ChurchService.getMemberStats(req.params.churchId, req.user);
      res.status(200).json({ success: true, data: stats });
    } catch (error) {
      next(error);
    }
  }

  async removeMemberFromChurch(req, res, next) {
    try {
      const { churchId, memberId } = req.params;
      await ChurchService.removeMemberFromChurch(memberId, churchId, req.user);

      res.status(200).json({
        success: true,
        message: 'Membro removido da comunidade',
      });
    } catch (error) {
      next(error);
    }
  }

  async updateMember(req, res, next) {
    try {
      const { churchId, memberId } = req.params;
      const { name, title, location, age } = req.body;
      const member = await ChurchService.updateMember(memberId, churchId, { name, title, location, age }, req.user);

      res.status(200).json({
        success: true,
        message: 'Membro atualizado',
        data: member,
      });
    } catch (error) {
      next(error);
    }
  }
}

module.exports = new ChurchController();
