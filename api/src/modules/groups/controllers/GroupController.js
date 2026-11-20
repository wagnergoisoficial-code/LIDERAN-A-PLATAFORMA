class GroupController {
  constructor(service) { this.service = service; }

  format(group, userId) {
    return {
      ...group,
      memberCount: group.members?.length ?? 0,
      isMember: group.members?.some(m => m.userId === userId) ?? false,
      isLeader: group.leaderId === userId,
    };
  }

  async getAll(req, res, next) {
    try {
      const groups = await this.service.getGroups(req.user);
      res.json({ success: true, data: groups.map(g => this.format(g, req.user.id)) });
    } catch (e) { next(e); }
  }

  async getById(req, res, next) {
    try {
      const group = await this.service.getGroupById(req.params.id, req.user);
      res.json({ success: true, data: this.format(group, req.user.id) });
    } catch (e) { next(e); }
  }

  async create(req, res, next) {
    try {
      const group = await this.service.createGroup(req.body, req.user);
      res.status(201).json({ success: true, message: 'Grupo criado', data: this.format(group, req.user.id) });
    } catch (e) { next(e); }
  }

  async update(req, res, next) {
    try {
      const group = await this.service.updateGroup(req.params.id, req.body, req.user);
      res.json({ success: true, message: 'Grupo atualizado', data: this.format(group, req.user.id) });
    } catch (e) { next(e); }
  }

  async remove(req, res, next) {
    try {
      await this.service.deleteGroup(req.params.id, req.user);
      res.json({ success: true, message: 'Grupo excluído' });
    } catch (e) { next(e); }
  }

  async join(req, res, next) {
    try {
      const group = await this.service.joinGroup(req.params.id, req.user);
      res.json({ success: true, message: 'Você entrou no grupo', data: this.format(group, req.user.id) });
    } catch (e) { next(e); }
  }

  async leave(req, res, next) {
    try {
      const group = await this.service.leaveGroup(req.params.id, req.user);
      res.json({ success: true, message: 'Você saiu do grupo', data: this.format(group, req.user.id) });
    } catch (e) { next(e); }
  }
}

module.exports = GroupController;
