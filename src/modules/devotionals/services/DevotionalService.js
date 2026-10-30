const { NotFoundError } = require('../../../shared/errors/AppError');
const { requireChurch, assertSameChurch, assertLeader } = require('../../../shared/utils/church.util');
const { notifyChurch, preview } = require('../../../shared/utils/notifier');

const ACTIVE_HOURS = 24;

class DevotionalService {
  constructor(devotionalRepository) {
    this.devotionalRepository = devotionalRepository;
  }

  async createDevotional(dto, user) {
    assertLeader(user, 'Apenas líderes podem publicar devocionais');
    const churchId = requireChurch(user);

    const devotional = await this.devotionalRepository.create({
      title: dto.title,
      content: dto.content,
      verse: dto.verse,
      userId: user.id,
      churchId,
      isActive: true,
      activatedAt: new Date(),
    });

    await notifyChurch(churchId, user.id, {
      type: 'new_devotional',
      title: `Novo devocional: ${devotional.title}`,
      body: devotional.verse || preview(devotional.content),
      linkId: devotional.id,
      linkType: 'devotional',
    });

    return this.format(devotional, user.id);
  }

  async getAllDevotionals(user) {
    if (!user.churchId) return [];
    const devotionals = await this.devotionalRepository.findAll(user.churchId);
    return devotionals.map((dev) => this.format(dev, user.id));
  }

  async findInChurch(id, user) {
    const devotional = await this.devotionalRepository.findById(id);

    if (!devotional) {
      throw new NotFoundError('Devocional não encontrado');
    }

    assertSameChurch(user, devotional.churchId, 'Devocional não encontrado');
    return devotional;
  }

  async deleteDevotional(id, user) {
    assertLeader(user, 'Apenas líderes podem excluir devocionais');
    await this.findInChurch(id, user);
    return this.devotionalRepository.delete(id);
  }

  async markAsInactive(id, user) {
    assertLeader(user);
    await this.findInChurch(id, user);
    const updated = await this.devotionalRepository.update(id, { isActive: false });
    return this.format(updated, user.id);
  }

  async reactivateDevotional(id, user) {
    assertLeader(user);
    await this.findInChurch(id, user);
    const updated = await this.devotionalRepository.update(id, {
      isActive: true,
      activatedAt: new Date(),
    });
    return this.format(updated, user.id);
  }

  async toggleLike(id, user) {
    await this.findInChurch(id, user);
    return this.devotionalRepository.toggleLike(id, user.id);
  }

  calculateHoursRemaining(activatedAt) {
    const expiry = new Date(activatedAt).getTime() + ACTIVE_HOURS * 60 * 60 * 1000;
    const hoursRemaining = (expiry - Date.now()) / (1000 * 60 * 60);
    return Math.max(0, Math.ceil(hoursRemaining));
  }

  // Um devocional fica ativo durante 24h após ser publicado ou reativado
  format(devotional, userId) {
    const hoursRemaining = this.calculateHoursRemaining(devotional.activatedAt);
    const shouldBeInactive = hoursRemaining <= 0;
    const { likes, ...rest } = devotional;

    return {
      ...rest,
      hoursRemaining,
      shouldBeInactive,
      isActive: devotional.isActive && !shouldBeInactive,
      likeCount: likes?.length || 0,
      hasLiked: likes?.some((l) => l.userId === userId) || false,
    };
  }
}

module.exports = DevotionalService;
