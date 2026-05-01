const { getPrismaClient } = require('../../../config/database');

// User Repository for database operations
class UserRepository {
  constructor() {
    this.prisma = getPrismaClient();
  }

  async findByEmail(email) {
    return this.prisma.user.findUnique({
      where: { email },
    });
  }

  async findById(id) {
    return this.prisma.user.findUnique({
      where: { id },
    });
  }

  async findByIdWithProfile(id) {
    return this.prisma.user.findUnique({
      where: { id },
      include: {
        socialLinks: true,
        achievements: true,
      },
    });
  }

  async create(data) {
    return this.prisma.user.create({
      data,
    });
  }

  async update(id, data) {
    return this.prisma.user.update({
      where: { id },
      data,
    });
  }

  async updateProfile(id, data) {
    const { socialLinks, ...profileData } = data;

    // Update main profile
    const user = await this.prisma.user.update({
      where: { id },
      data: profileData,
      include: {
        socialLinks: true,
        achievements: true,
      },
    });

    // Handle social links
    if (socialLinks && Array.isArray(socialLinks)) {
      // Delete existing links
      await this.prisma.socialLink.deleteMany({
        where: { userId: id },
      });

      // Create new links
      for (const link of socialLinks) {
        await this.prisma.socialLink.create({
          data: {
            platform: link.platform,
            url: link.url,
            userId: id,
          },
        });
      }
    }

    return user;
  }

  async delete(id) {
    return this.prisma.user.delete({
      where: { id },
    });
  }

  async findByChurch(churchId) {
    return this.prisma.user.findMany({
      where: { churchId },
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
        createdAt: true,
      },
    });
  }

  // Social Links
  async getSocialLinks(userId) {
    return this.prisma.socialLink.findMany({
      where: { userId },
    });
  }

  async addSocialLink(userId, platform, url) {
    return this.prisma.socialLink.create({
      data: {
        userId,
        platform,
        url,
      },
    });
  }

  async removeSocialLink(linkId) {
    return this.prisma.socialLink.delete({
      where: { id: linkId },
    });
  }

  // Achievements
  async getAchievements(userId) {
    return this.prisma.achievement.findMany({
      where: { userId },
    });
  }

  async addAchievement(userId, name, description, icon) {
    return this.prisma.achievement.create({
      data: {
        userId,
        name,
        description,
        icon,
      },
    });
  }

  // Blocked Users
  async blockUser(blockerId, blockedId) {
    return this.prisma.blockedUser.create({
      data: {
        blockerId,
        blockedId,
      },
    });
  }

  async unblockUser(blockerId, blockedId) {
    return this.prisma.blockedUser.deleteMany({
      where: {
        blockerId,
        blockedId,
      },
    });
  }

  async isUserBlocked(blockerId, blockedId) {
    const blocked = await this.prisma.blockedUser.findFirst({
      where: {
        blockerId,
        blockedId,
      },
    });
    return !!blocked;
  }

  async getBlockedUsers(userId) {
    return this.prisma.blockedUser.findMany({
      where: { blockerId: userId },
      include: {
        blocked: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
      },
    });
  }
}

module.exports = UserRepository;
