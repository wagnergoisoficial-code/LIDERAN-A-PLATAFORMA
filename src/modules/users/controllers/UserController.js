// User Controller - HTTP layer
class UserController {
  constructor(userService) {
    this.userService = userService;
  }

  async getAllUsers(req, res, next) {
    try {
      const churchId = req.user.churchId;

      const users = await this.userService.getAllUsers(churchId);

      res.status(200).json({
        success: true,
        message: 'Users retrieved successfully',
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
        message: 'User retrieved successfully',
        data: user,
      });
    } catch (error) {
      next(error);
    }
  }

  async getProfile(req, res, next) {
    try {
      const { id } = req.params;

      const profile = await this.userService.getProfileById(id);

      res.status(200).json({
        success: true,
        message: 'Profile retrieved successfully',
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
        message: 'Profile updated successfully',
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
        message: 'Social link added successfully',
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
        message: 'Social links retrieved successfully',
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
        message: 'Social link removed successfully',
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
        message: 'Achievements retrieved successfully',
        data: achievements,
      });
    } catch (error) {
      next(error);
    }
  }

  async createUser(req, res, next) {
    try {
      const CreateUserDto = require('../dtos/CreateUserDto');
      const dto = new CreateUserDto({
        ...req.body,
        churchId: req.user.churchId,
      });
      dto.validate();

      const user = await this.userService.createUser(dto);

      res.status(201).json({
        success: true,
        message: 'User created successfully',
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
        message: 'User blocked successfully',
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
        message: 'User unblocked successfully',
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
        message: 'Blocked users retrieved successfully',
        data: blockedUsers,
      });
    } catch (error) {
      next(error);
    }
  }
}

module.exports = UserController;
