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
      const { churchId, id: userId } = req.user;
      if (!churchId) return res.json({ success: true, data: [] });
      const groups = await this.service.getGroups(churchId);
      res.json({ success: true, data: groups.map(g => this.format(g, userId)) });
    } catch (e) { next(e); }
  }

  async create(req, res, next) {
    try {
      const { churchId, id: leaderId, role } = req.user;
      if (!['leader', 'admin'].includes(role))
        return res.status(403).json({ success: false, message: 'Acesso negado' });
      const { name, description, category } = req.body;
      const group = await this.service.createGroup({
        name, description: description || null,
        category: category || 'celula', churchId, leaderId,
      });
      await this.service.joinGroup(group.id, leaderId).catch(() => {});
      const fresh = await this.service.getGroupById(group.id);
      res.status(201).json({ success: true, data: this.format(fresh, leaderId) });
    } catch (e) { next(e); }
  }

  async update(req, res, next) {
    try {
      const { id: userId, role } = req.user;
      if (!['leader', 'admin'].includes(role))
        return res.status(403).json({ success: false, message: 'Acesso negado' });
      const { name, description, category } = req.body;
      const group = await this.service.updateGroup(req.params.id, {
        ...(name && { name }),
        ...(description !== undefined && { description }),
        ...(category && { category }),
      });
      res.json({ success: true, data: this.format(group, userId) });
    } catch (e) { next(e); }
  }

  async remove(req, res, next) {
    try {
      const { role } = req.user;
      if (!['leader', 'admin'].includes(role))
        return res.status(403).json({ success: false, message: 'Acesso negado' });
      await this.service.deleteGroup(req.params.id);
      res.json({ success: true });
    } catch (e) { next(e); }
  }

  async join(req, res, next) {
    try {
      const { id: userId } = req.user;
      await this.service.joinGroup(req.params.id, userId);
      res.json({ success: true });
    } catch (e) { next(e); }
  }

  async leave(req, res, next) {
    try {
      const { id: userId } = req.user;
      await this.service.leaveGroup(req.params.id, userId);
      res.json({ success: true });
    } catch (e) { next(e); }
  }
}

module.exports = GroupController;
