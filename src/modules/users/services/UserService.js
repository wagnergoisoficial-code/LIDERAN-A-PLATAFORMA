const { NotFoundError, ConflictError, ForbiddenError, ValidationError } = require('../../../shared/errors/AppError');
const { requireChurch, isAdmin } = require('../../../shared/utils/church.util');
const bcrypt = require('bcrypt');

const parseSkills = (value) => {
  if (!value) return [];
  try {
    const skills = JSON.parse(value);
    return Array.isArray(skills) ? skills : [];
  } catch {
    return [];
  }
};

// User Service - business logic
class UserService {
  constructor(userRepository) {
    this.userRepository = userRepository;
  }

  async getAllUsers(user) {
    if (!user.churchId) return [];
    return await this.userRepository.findAll(user.churchId);
  }

  async getUserById(id) {
    const user = await this.userRepository.findById(id);

    if (!user) {
      throw new NotFoundError('Usuário não encontrado');
    }

    return user;
  }

  // Perfis são visíveis para o próprio, membros da mesma comunidade, o líder dela e admins
  async getProfileById(id, requester) {
    const user = await this.userRepository.findByIdWithProfile(id);

    if (!user) {
      throw new NotFoundError('Usuário não encontrado');
    }

    if (requester && !this.canViewProfile(requester, user)) {
      throw new NotFoundError('Usuário não encontrado');
    }

    const profile = this.formatProfile(user);

    if (requester && requester.id !== user.id) {
      profile.isBlocked = await this.userRepository.isUserBlocked(requester.id, user.id);
    }

    return profile;
  }

  canViewProfile(requester, user) {
    if (requester.id === user.id || isAdmin(requester)) return true;
    if (user.churchId && user.churchId === requester.churchId) return true;
    return !!user.church && user.church.leaderID === requester.id;
  }

  // Líderes cadastram membros/líderes na sua comunidade; só admins criam admins
  async createUser(createUserDto, requester) {
    const churchId = requireChurch(requester);

    if (createUserDto.role === 'admin' && !isAdmin(requester)) {
      throw new ForbiddenError('Apenas administradores podem criar outros administradores');
    }

    const existingUser = await this.userRepository.findByEmail(createUserDto.email);

    if (existingUser) {
      throw new ConflictError('Este e-mail já está cadastrado');
    }

    const hashedPassword = await bcrypt.hash(createUserDto.password, 10);

    const user = await this.userRepository.create({
      name: createUserDto.name,
      email: createUserDto.email,
      password: hashedPassword,
      churchId,
      role: createUserDto.role,
      leaderId: requester.id,
    });

    return {
      id: user.id,
      name: user.name,
      email: user.email,
      role: user.role,
      churchId: user.churchId,
      createdAt: user.createdAt,
    };
  }

  // Campos ausentes ficam como estão; texto vazio limpa o campo
  async updateProfile(userId, dto) {
    const user = await this.userRepository.findById(userId);

    if (!user) {
      throw new NotFoundError('Usuário não encontrado');
    }

    const clean = (value) => (typeof value === 'string' ? value.trim() || null : value ?? null);
    const updateData = {};

    if (dto.name !== undefined) {
      const name = String(dto.name || '').trim();
      if (name.length < 2) throw new ValidationError('O nome deve ter pelo menos 2 caracteres');
      updateData.name = name;
    }
    if (dto.age !== undefined) {
      updateData.age = dto.age === null || dto.age === '' ? null : parseInt(dto.age, 10);
      if (updateData.age !== null && Number.isNaN(updateData.age)) throw new ValidationError('Idade inválida');
    }
    if (dto.bio !== undefined) updateData.bio = clean(dto.bio);
    if (dto.location !== undefined) updateData.location = clean(dto.location);
    if (dto.title !== undefined) updateData.title = clean(dto.title);
    if (dto.profileImage !== undefined) updateData.profileImage = clean(dto.profileImage);
    if (dto.backgroundTheme) updateData.backgroundTheme = dto.backgroundTheme;
    if (dto.skills !== undefined) {
      const skills = (Array.isArray(dto.skills) ? dto.skills : [])
        .map((skill) => String(skill).trim())
        .filter(Boolean);
      updateData.skills = JSON.stringify([...new Set(skills)].slice(0, 20));
    }
    if (dto.socialLinks !== undefined) updateData.socialLinks = dto.socialLinks;

    const updated = await this.userRepository.updateProfile(userId, updateData);
    const fresh = await this.userRepository.findByIdWithProfile(updated.id);

    return this.formatProfile(fresh);
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
      throw new ConflictError('Você não pode bloquear a si mesmo');
    }

    await this.getUserById(blockerId);
    await this.getUserById(blockedId);

    if (await this.userRepository.isUserBlocked(blockerId, blockedId)) {
      throw new ConflictError('Este usuário já está bloqueado');
    }

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
      skills: parseSkills(user.skills),
      profileImage: user.profileImage,
      backgroundTheme: user.backgroundTheme,
      location: user.location,
      title: user.title,
      churchId: user.churchId,
      churchName: user.church?.name || null,
      createdAt: user.createdAt,
      socialLinks: user.socialLinks || [],
      achievements: user.achievements || [],
    };
  }
}

module.exports = UserService;
