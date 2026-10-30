class GroupService {
  constructor(repo) { this.repo = repo; }
  async createGroup(data) { return this.repo.create(data); }
  async getGroups(churchId) { return this.repo.findAll(churchId); }
  async getGroupById(id) { return this.repo.findById(id); }
  async updateGroup(id, data) { return this.repo.update(id, data); }
  async deleteGroup(id) { return this.repo.delete(id); }
  async joinGroup(groupId, userId) { return this.repo.join(groupId, userId); }
  async leaveGroup(groupId, userId) { return this.repo.leave(groupId, userId); }
}

module.exports = GroupService;
