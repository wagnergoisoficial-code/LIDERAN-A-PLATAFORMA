class SermonService {
  constructor(repo) { this.repo = repo; }
  async createSermon(data) { return this.repo.create(data); }
  async getSermons(churchId) { return this.repo.findAll(churchId); }
  async getSermonById(id) { return this.repo.findById(id); }
  async updateSermon(id, data) { return this.repo.update(id, data); }
  async deleteSermon(id) { return this.repo.delete(id); }
}

module.exports = SermonService;
