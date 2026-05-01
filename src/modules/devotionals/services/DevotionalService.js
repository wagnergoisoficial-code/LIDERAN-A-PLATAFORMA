const { NotFoundError } = require('../../../shared/errors/AppError');

// Devotional Service
class DevotionalService {
  constructor(devotionalRepository) {
    this.devotionalRepository = devotionalRepository;
  }

  async createDevotional(createDevotionalDto) {
    return await this.devotionalRepository.create({
      title: createDevotionalDto.title,
      content: createDevotionalDto.content,
      verse: createDevotionalDto.verse,
      userId: createDevotionalDto.userId,
      churchId: createDevotionalDto.churchId,
      isActive: true,
      activatedAt: new Date(),
    });
  }

  async getAllDevotionals(churchId) {
    const devotionals = await this.devotionalRepository.findAll(churchId);
    return devotionals.map(dev => this.formatDevotionalWithTimeRemaining(dev));
  }

  async getDevotionalById(id) {
    const devotional = await this.devotionalRepository.findById(id);

    if (!devotional) {
      throw new NotFoundError('Devotional not found');
    }

    return this.formatDevotionalWithTimeRemaining(devotional);
  }

  async deleteDevotional(id) {
    await this.getDevotionalById(id);
    return await this.devotionalRepository.delete(id);
  }

  async markAsInactive(id) {
    const devotional = await this.devotionalRepository.findById(id);

    if (!devotional) {
      throw new NotFoundError('Devocional não encontrado');
    }

    return await this.devotionalRepository.update(id, { isActive: false });
  }

  async reactivateDevotional(id) {
    const devotional = await this.devotionalRepository.findById(id);

    if (!devotional) {
      throw new NotFoundError('Devocional não encontrado');
    }

    return await this.devotionalRepository.update(id, { 
      isActive: true,
      activatedAt: new Date(),
    });
  }

  // Calculate hours remaining until inactive (24 hours after activation)
  calculateHoursRemaining(activatedAt) {
    const now = new Date();
    const activationTime = new Date(activatedAt);
    const twentyFourHoursInMs = 24 * 60 * 60 * 1000;
    const expiryTime = new Date(activationTime.getTime() + twentyFourHoursInMs);
    
    const hoursRemaining = (expiryTime.getTime() - now.getTime()) / (1000 * 60 * 60);
    
    return Math.max(0, Math.ceil(hoursRemaining));
  }

  // Check if devotional should be automatically deactivated
  shouldBeInactive(activatedAt) {
    const hoursRemaining = this.calculateHoursRemaining(activatedAt);
    return hoursRemaining <= 0;
  }

  formatDevotionalWithTimeRemaining(devotional) {
    const hoursRemaining = this.calculateHoursRemaining(devotional.activatedAt);
    const shouldBeInactive = this.shouldBeInactive(devotional.activatedAt);

    return {
      ...devotional,
      hoursRemaining,
      shouldBeInactive,
      isActive: devotional.isActive && !shouldBeInactive,
    };
  }
}

module.exports = DevotionalService;
