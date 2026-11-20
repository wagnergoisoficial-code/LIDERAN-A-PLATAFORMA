const { NotFoundError, ValidationError, ConflictError, ForbiddenError } = require('../../../shared/errors/AppError');
const { requireChurch, assertSameChurch, assertLeader, isLeaderOrAdmin } = require('../../../shared/utils/church.util');
const { notifyChurch, notifyUser } = require('../../../shared/utils/notifier');

const CATEGORIES = ['celula', 'ministerio', 'jovens', 'casais', 'infantil', 'louvor', 'outro'];

class GroupService {
  constructor(repo) { this.repo = repo; }

  buildData(dto, partial = false) {
    const data = {};

    if (!partial || dto.name !== undefined) {
      data.name = typeof dto.name === 'string' ? dto.name.trim() : '';
      if (data.name.length < 3) throw new ValidationError('O nome do grupo deve ter pelo menos 3 caracteres');
    }
    if (dto.description !== undefined) {
      data.description = typeof dto.description === 'string' && dto.description.trim() ? dto.description.trim() : null;
    }
    if (!partial || dto.category !== undefined) {
      data.category = dto.category || 'celula';
      if (!CATEGORIES.includes(data.category)) throw new ValidationError('Categoria inválida');
    }

    return data;
  }

  async createGroup(dto, user) {
    assertLeader(user, 'Apenas líderes podem criar grupos');
    const churchId = requireChurch(user);

    const group = await this.repo.create({ ...this.buildData(dto), churchId, leaderId: user.id });
    await this.repo.join(group.id, user.id, 'leader');

    await notifyChurch(churchId, user.id, {
      type: 'new_group',
      title: `Novo grupo: ${group.name}`,
      body: group.description || 'Participe pela página de Células',
      linkId: group.id,
      linkType: 'group',
    });

    return this.repo.findById(group.id);
  }

  async getGroups(user) {
    if (!user.churchId) return [];
    return this.repo.findAll(user.churchId);
  }

  async getGroupById(id, user) {
    const group = await this.repo.findById(id);
    if (!group) throw new NotFoundError('Grupo não encontrado');
    assertSameChurch(user, group.churchId, 'Grupo não encontrado');
    return group;
  }

  // Gestão: líder do grupo, líderes da comunidade ou admin
  async findManageable(id, user) {
    const group = await this.getGroupById(id, user);
    if (group.leaderId !== user.id && !isLeaderOrAdmin(user)) {
      throw new ForbiddenError('Apenas o líder do grupo pode gerenciá-lo');
    }
    return group;
  }

  async updateGroup(id, dto, user) {
    await this.findManageable(id, user);
    return this.repo.update(id, this.buildData(dto, true));
  }

  async deleteGroup(id, user) {
    await this.findManageable(id, user);
    return this.repo.delete(id);
  }

  async joinGroup(id, user) {
    const group = await this.getGroupById(id, user);
    if (group.members.some((m) => m.userId === user.id)) throw new ConflictError('Você já participa deste grupo');

    await this.repo.join(id, user.id);

    if (group.leaderId !== user.id) {
      await notifyUser(group.leaderId, {
        type: 'group_join',
        title: `${user.name} entrou no grupo`,
        body: group.name,
        linkId: group.id,
        linkType: 'group',
      });
    }

    return this.repo.findById(id);
  }

  async leaveGroup(id, user) {
    const group = await this.getGroupById(id, user);
    if (group.leaderId === user.id) throw new ValidationError('O líder do grupo não pode sair dele');
    await this.repo.leave(id, user.id);
    return this.repo.findById(id);
  }
}

GroupService.CATEGORIES = CATEGORIES;

module.exports = GroupService;
