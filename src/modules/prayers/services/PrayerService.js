const { NotFoundError, ForbiddenError } = require('../../../shared/errors/AppError');

class PrayerService {
  constructor(prayerRepository) {
    this.prayerRepository = prayerRepository;
  }

  async create(dto) {
    return this.prayerRepository.create({
      title: dto.title,
      content: dto.content,
      isAnonymous: dto.isAnonymous || false,
      userId: dto.userId,
      churchId: dto.churchId,
    });
  }

  async getAll(churchId) {
    return this.prayerRepository.findAll(churchId);
  }

  async getById(id) {
    const pr = await this.prayerRepository.findById(id);
    if (!pr) throw new NotFoundError('Prayer request not found');
    return pr;
  }

  async markAnswered(id, userId, role) {
    const pr = await this.getById(id);
    if (pr.userId !== userId && role !== 'admin' && role !== 'leader') throw new ForbiddenError('Not authorized');
    return this.prayerRepository.update(id, { isAnswered: true });
  }

  async delete(id, userId, role) {
    const pr = await this.getById(id);
    if (pr.userId !== userId && role !== 'admin') throw new ForbiddenError('Not authorized');
    return this.prayerRepository.delete(id);
  }

  async pray(id, userId) {
    await this.getById(id);
    return this.prayerRepository.pray(id, userId);
  }

  async unpray(id, userId) {
    await this.getById(id);
    return this.prayerRepository.unpray(id, userId);
  }
}

module.exports = PrayerService;
