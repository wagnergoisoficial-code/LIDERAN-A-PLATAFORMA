const ChurchRepository = require('../repositories/ChurchRepository');
const CreateChurchDto = require('../dtos/CreateChurchDto');
const { isUploadUrl } = require('../../../shared/utils/url.util');
const JwtUtil = require('../../../shared/utils/jwt.util');
const { canManageChurch, canViewChurch, isAdmin } = require('../../../shared/utils/church.util');
const {
  ValidationError,
  NotFoundError,
  ForbiddenError,
  ConflictError,
} = require('../../../shared/errors/AppError');

const parseDays = (value) => {
  if (!value) return [];
  try {
    const days = JSON.parse(value);
    return Array.isArray(days) ? days : [];
  } catch {
    return [];
  }
};

class ChurchService {
  format(church, user) {
    return {
      ...church,
      cultosDias: parseDays(church.cultosDias),
      memberCount: church._count?.users ?? church.users?.length ?? 0,
      isActive: user?.churchId === church.id,
      isOwner: church.leaderID === user?.id,
    };
  }

  async findOr404(churchId) {
    const church = await ChurchRepository.findById(churchId);
    if (!church) throw new NotFoundError('Comunidade não encontrada');
    return church;
  }

  async findManageable(churchId, user, message = 'Apenas os líderes desta comunidade podem realizar esta ação') {
    const church = await this.findOr404(churchId);
    if (!canManageChurch(user, church)) throw new ForbiddenError(message);
    return church;
  }

  async createChurch(data, user) {
    const dto = new CreateChurchDto(data);
    dto.validate();

    const church = await ChurchRepository.create({
      name: dto.name,
      title: dto.title,
      description: dto.description,
      imageUrl: dto.imageUrl,
      cultosDias: dto.cultosDias,
      leaderID: user.id,
    });

    // Quem cria a comunidade passa a participar dela (torna-se a comunidade ativa)
    const activeUser = await ChurchRepository.setUserChurch(user.id, church.id);

    const fresh = await this.findOr404(church.id);
    return { church: this.format(fresh, activeUser), session: this.session(activeUser) };
  }

  async getChurch(churchId, user) {
    const church = await this.findOr404(churchId);
    if (!canViewChurch(user, church)) throw new NotFoundError('Comunidade não encontrada');
    return this.format(church, user);
  }

  // Admins veem todas as comunidades; líderes, as que criaram
  async getChurchesByLeader(user) {
    const churches = await ChurchRepository.findByLeaderId(isAdmin(user) ? null : user.id);
    return churches.map((church) => this.format(church, user));
  }

  async updateChurch(churchId, data, user) {
    await this.findManageable(churchId, user, 'Apenas os líderes desta comunidade podem editá-la');

    const update = { ...data };

    if (data.name !== undefined) {
      update.name = String(data.name || '').trim();
      if (update.name.length < 2) throw new ValidationError('O nome da comunidade deve ter pelo menos 2 caracteres');
    }

    if (data.imageUrl && !isUploadUrl(data.imageUrl)) {
      throw new ValidationError('Imagem da comunidade inválida');
    }

    if (data.cultosDias !== undefined && data.cultosDias !== null) {
      const valid = Array.isArray(data.cultosDias) && data.cultosDias.every((dia) => CreateChurchDto.VALID_DAYS.includes(dia));
      if (!valid) throw new ValidationError('Dias de culto inválidos');
    }

    await ChurchRepository.update(churchId, update);
    return this.format(await this.findOr404(churchId), user);
  }

  async deleteChurch(churchId, user) {
    const church = await this.findOr404(churchId);

    if (church.leaderID !== user.id && !isAdmin(user)) {
      throw new ForbiddenError('Apenas quem criou a comunidade pode excluí-la');
    }

    await ChurchRepository.delete(churchId);

    // Se era a comunidade ativa do líder, passa para outra que ele lidere
    let activeUser = await ChurchRepository.findUser(user.id);
    if (activeUser && !activeUser.churchId) {
      const [next] = await ChurchRepository.findByLeaderId(user.id);
      if (next) activeUser = await ChurchRepository.setUserChurch(user.id, next.id);
    }

    return { session: this.session(activeUser) };
  }

  // Define a comunidade ativa do líder (feed, chat, eventos... passam a ser desta comunidade)
  async activateChurch(churchId, user) {
    const church = await this.findOr404(churchId);

    if (church.leaderID !== user.id && !isAdmin(user)) {
      throw new ForbiddenError('Você só pode ativar comunidades que lidera');
    }

    const updated = await ChurchRepository.setUserChurch(user.id, church.id);
    return { church: this.format(church, updated), session: this.session(updated) };
  }

  async getChurchMembers(churchId, user) {
    await this.getChurch(churchId, user);
    return ChurchRepository.getMembers(churchId);
  }

  // Adiciona um utilizador existente (sem comunidade) a esta comunidade
  async addMemberToChurch(userId, churchId, user) {
    await this.findManageable(churchId, user, 'Apenas os líderes desta comunidade podem adicionar membros');

    if (!userId) throw new ValidationError('Informe o usuário a adicionar');

    const target = await ChurchRepository.findUser(userId);
    if (!target) throw new NotFoundError('Usuário não encontrado');

    if (target.churchId === churchId) throw new ConflictError('Este usuário já faz parte da comunidade');
    if (target.churchId && !isAdmin(user)) throw new ConflictError('Este usuário já pertence a outra comunidade');

    await ChurchRepository.setUserChurch(userId, churchId);
    return ChurchRepository.getMemberById(userId, churchId);
  }

  async removeMemberFromChurch(memberId, churchId, user) {
    const church = await this.findManageable(churchId, user, 'Apenas os líderes desta comunidade podem remover membros');

    if (memberId === church.leaderID) {
      throw new ValidationError('O criador da comunidade não pode ser removido');
    }

    if (memberId === user.id) {
      throw new ValidationError('Você não pode remover a si mesmo');
    }

    const result = await ChurchRepository.removeMemberFromChurch(memberId, churchId);

    if (result.count === 0) {
      throw new NotFoundError('Membro não encontrado nesta comunidade');
    }

    return result;
  }

  async getMemberStats(churchId, user) {
    await this.getChurch(churchId, user);
    return ChurchRepository.getMemberStats(churchId);
  }

  async updateMember(memberId, churchId, data, user) {
    await this.findManageable(churchId, user, 'Apenas os líderes desta comunidade podem editar membros');

    const update = {};

    if (data.name !== undefined) {
      const name = String(data.name || '').trim();
      if (name.length < 2) throw new ValidationError('O nome deve ter pelo menos 2 caracteres');
      update.name = name;
    }
    if (data.title !== undefined) update.title = data.title ? String(data.title).trim() : null;
    if (data.location !== undefined) update.location = data.location ? String(data.location).trim() : null;
    if (data.age !== undefined) {
      const age = data.age === null || data.age === '' ? null : parseInt(data.age, 10);
      if (age !== null && (Number.isNaN(age) || age < 1 || age > 150)) {
        throw new ValidationError('Idade deve ser entre 1 e 150');
      }
      update.age = age;
    }

    const result = await ChurchRepository.updateMember(memberId, churchId, update);

    if (result.count === 0) {
      throw new NotFoundError('Membro não encontrado nesta comunidade');
    }

    return ChurchRepository.getMemberById(memberId, churchId);
  }

  session(user) {
    if (!user) return null;
    return {
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        role: user.role,
        churchId: user.churchId,
        profileImage: user.profileImage || null,
        title: user.title || null,
      },
      token: JwtUtil.sign({ id: user.id, email: user.email, role: user.role, churchId: user.churchId }),
    };
  }
}

module.exports = new ChurchService();
