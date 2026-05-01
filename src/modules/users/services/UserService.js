const { NotFoundError, ConflictError } = require('../../../shared/errors/AppError');
const bcrypt = require('bcrypt');

// User Service - business logic
class UserService {
  constructor(userRepository) {
    this.userRepository = userRepository;
  }

  async getAllUsers(churchId) {
    return await this.userRepository.findAll(churchId);
  }

  async getUserById(id) {
    const user = await this.userRepository.findById(id);

    if (!user) {
      throw new NotFoundError('User not found');
    }

    return user;
  }

  async getProfileById(id) {
    const user = await this.userRepository.findByIdWithProfile(id);

    if (!user) {
      throw new NotFoundError('Usuário não encontrado');
    }

    return {
      id: user.id,
      name: user.name,
      email: user.email,
      role: user.role,
      age: user.age,
      bio: user.bio,
      skills: user.skills ? JSON.parse(user.skills) : [],
      profileImage: user.profileImage,
      backgroundTheme: user.backgroundTheme,
      location: user.location,
      title: user.title,
      createdAt: user.createdAt,
      socialLinks: user.socialLinks,
      achievements: user.achievements,
    };
  }

  async createUser(createUserDto) {
    // Check if user already exists
    const existingUser = await this.userRepository.findByEmail(createUserDto.email);

    if (existingUser) {
      throw new ConflictError('Email já cadastrado');
    }

    // Hash password
    const hashedPassword = await bcrypt.hash(createUserDto.password, 10);

    // Create user
    const user = await this.userRepository.create({
      name: createUserDto.name,
      email: createUserDto.email,
      password: hashedPassword,
      churchId: createUserDto.churchId,
      role: createUserDto.role,
    });

    return {
      id: user.id,
      name: user.name,
      email: user.email,
      role: user.role,
      createdAt: user.createdAt,
    };
  }

  async updateProfile(userId, updateUserProfileDto) {
    const user = await this.userRepository.findById(userId);

    if (!user) {
      throw new NotFoundError('Usuário não encontrado');
    }

    const updateData = {};
    
    if (updateUserProfileDto.name) updateData.name = updateUserProfileDto.name;
    if (updateUserProfileDto.age) updateData.age = updateUserProfileDto.age;
    if (updateUserProfileDto.bio) updateData.bio = updateUserProfileDto.bio;
    if (updateUserProfileDto.location) updateData.location = updateUserProfileDto.location;
    if (updateUserProfileDto.title) updateData.title = updateUserProfileDto.title;
    if (updateUserProfileDto.profileImage) updateData.profileImage = updateUserProfileDto.profileImage;
    if (updateUserProfileDto.backgroundTheme) updateData.backgroundTheme = updateUserProfileDto.backgroundTheme;
    if (updateUserProfileDto.skills) updateData.skills = JSON.stringify(updateUserProfileDto.skills);

    updateData.socialLinks = updateUserProfileDto.socialLinks;

    const updated = await this.userRepository.updateProfile(userId, updateData);

    return this.formatProfile(updated);
  }

  async getSocialLinks(userId) {
    await this.getUserById(userId);
    return await this.userRepository.getSocialLinks(userId);
  }

  async addSocialLink(userId, platform, url) {
    await this.getUserById(userId);
    return await this.userRepository.addSocialLink(userId, platform, url);
  }

  async removeSocialLink(linkId, userId) {
    const link = await this.userRepository.prisma.socialLink.findUnique({
      where: { id: linkId },
    });

    if (!link || link.userId !== userId) {
      throw new NotFoundError('Link social não encontrado');
    }

    return await this.userRepository.removeSocialLink(linkId);
  }

  async getAchievements(userId) {
    await this.getUserById(userId);
    return await this.userRepository.getAchievements(userId);
  }

  async addAchievement(userId, name, description, icon) {
    await this.getUserById(userId);
    return await this.userRepository.addAchievement(userId, name, description, icon);
  }

  async blockUser(blockerId, blockedId) {
    if (blockerId === blockedId) {
      throw new ConflictError('Você não pode se bloquear');
    }

    await this.getUserById(blockerId);
    await this.getUserById(blockedId);

    return await this.userRepository.blockUser(blockerId, blockedId);
  }

  async unblockUser(blockerId, blockedId) {
    await this.getUserById(blockerId);
    await this.getUserById(blockedId);

    return await this.userRepository.unblockUser(blockerId, blockedId);
  }

  async getBlockedUsers(userId) {
    await this.getUserById(userId);
    return await this.userRepository.getBlockedUsers(userId);
  }

  formatProfile(user) {
    return {
      id: user.id,
      name: user.name,
      email: user.email,
      role: user.role,
      age: user.age,
      bio: user.bio,
      skills: user.skills ? JSON.parse(user.skills) : [],
      profileImage: user.profileImage,
      backgroundTheme: user.backgroundTheme,
      location: user.location,
      title: user.title,
      createdAt: user.createdAt,
      socialLinks: user.socialLinks,
      achievements: user.achievements,
    };
  }
}

module.exports = UserService;
