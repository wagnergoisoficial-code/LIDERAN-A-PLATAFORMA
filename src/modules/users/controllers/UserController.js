// User Controller - HTTP layer
class UserController {
  constructor(userService) {
    this.userService = userService;
  }

  async getAllUsers(req, res, next) {
    try {
      const users = await this.userService.getAllUsers(req.user);

      res.status(200).json({
        success: true,
        data: users,
      });
    } catch (error) {
      next(error);
    }
  }

  async getUserById(req, res, next) {
    try {
      const { id } = req.params;

      const user = await this.userService.getUserById(id);

      res.status(200).json({
        success: true,
                data: user,
      });
    } catch (error) {
      next(error);
    }
  }

  async getProfile(req, res, next) {
    try {
      const { id } = req.params;

      const profile = await this.userService.getProfileById(id, req.user);

      res.status(200).json({
        success: true,
        data: profile,
      });
    } catch (error) {
      next(error);
    }
  }

  async updateProfile(req, res, next) {
    try {
      const UpdateUserProfileDto = require('../dtos/UpdateUserProfileDto');
      const dto = new UpdateUserProfileDto(req.body);
      dto.validate();

      const profile = await this.userService.updateProfile(req.user.id, dto);

      res.status(200).json({
        success: true,
        message: 'Perfil atualizado',
        data: profile,
      });
    } catch (error) {
      next(error);
    }
  }

  async updateProfileAvatar(req, res, next) {
    try {
      if (!req.body.imageUrl) {
        return res.status(400).json({ success: false, message: 'Nenhuma imagem enviada' });
      }

      const profile = await this.userService.updateProfile(req.user.id, { profileImage: req.body.imageUrl });

      res.status(200).json({
        success: true,
        message: 'Avatar atualizado com sucesso',
        data: profile,
      });
    } catch (error) {
      next(error);
    }
  }

  async addSocialLink(req, res, next) {
    try {
      const AddSocialLinkDto = require('../dtos/AddSocialLinkDto');
      const dto = new AddSocialLinkDto(req.body);
      dto.validate();

      const link = await this.userService.addSocialLink(req.user.id, dto.platform, dto.url);

      res.status(201).json({
        success: true,
        message: 'Rede social adicionada',
        data: link,
      });
    } catch (error) {
      next(error);
    }
  }

  async getSocialLinks(req, res, next) {
    try {
      const { id } = req.params;
      
      const links = await this.userService.getSocialLinks(id);

      res.status(200).json({
        success: true,
                data: links,
      });
    } catch (error) {
      next(error);
    }
  }

  async removeSocialLink(req, res, next) {
    try {
      const { linkId } = req.params;

      await this.userService.removeSocialLink(linkId, req.user.id);

      res.status(200).json({
        success: true,
        message: 'Rede social removida',
      });
    } catch (error) {
      next(error);
    }
  }

  async getAchievements(req, res, next) {
    try {
      const { id } = req.params;

      const achievements = await this.userService.getAchievements(id);

      res.status(200).json({
        success: true,
                data: achievements,
      });
    } catch (error) {
      next(error);
    }
  }

  async createUser(req, res, next) {
    try {
      const CreateUserDto = require('../dtos/CreateUserDto');
      const dto = new CreateUserDto(req.body);
      dto.validate();

      const user = await this.userService.createUser(dto, req.user);

      res.status(201).json({
        success: true,
        message: 'Usuário criado com sucesso',
        data: user,
      });
    } catch (error) {
      next(error);
    }
  }

  async blockUser(req, res, next) {
    try {
      const { blockedId } = req.params;

      await this.userService.blockUser(req.user.id, blockedId);

      res.status(200).json({
        success: true,
        message: 'Usuário bloqueado',
      });
    } catch (error) {
      next(error);
    }
  }

  async unblockUser(req, res, next) {
    try {
      const { blockedId } = req.params;

      await this.userService.unblockUser(req.user.id, blockedId);

      res.status(200).json({
        success: true,
        message: 'Usuário desbloqueado',
      });
    } catch (error) {
      next(error);
    }
  }

  async getBlockedUsers(req, res, next) {
    try {
      const blockedUsers = await this.userService.getBlockedUsers(req.user.id);

      res.status(200).json({
        success: true,
                data: blockedUsers,
      });
    } catch (error) {
      next(error);
    }
  }
}

module.exports = UserController;
