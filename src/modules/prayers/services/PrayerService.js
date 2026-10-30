const { NotFoundError, ValidationError } = require('../../../shared/errors/AppError');
const { requireChurch, assertSameChurch, assertOwnerOrLeader } = require('../../../shared/utils/church.util');
const { notifyChurch, notifyUser, notifyUsers, preview } = require('../../../shared/utils/notifier');

class PrayerService {
  constructor(prayerRepository) {
    this.prayerRepository = prayerRepository;
  }

  async create(dto, user) {
    const churchId = requireChurch(user);
    const title = typeof dto.title === 'string' ? dto.title.trim() : '';
    const content = typeof dto.content === 'string' ? dto.content.trim() : '';

    if (title.length < 3) throw new ValidationError('O título deve ter pelo menos 3 caracteres');
    if (content.length < 5) throw new ValidationError('Descreva o pedido (mínimo 5 caracteres)');

    const isAnonymous = !!dto.isAnonymous;
    const pr = await this.prayerRepository.create({ title, content, isAnonymous, userId: user.id, churchId });

    await notifyChurch(churchId, user.id, {
      type: 'new_prayer',
      title: isAnonymous ? 'Novo pedido de oração' : `${user.name} pediu oração`,
      body: preview(title),
      linkId: pr.id,
      linkType: 'prayer_request',
    });

    return pr;
  }

  async getAll(user) {
    if (!user.churchId) return [];
    return this.prayerRepository.findAll(user.churchId);
  }

  async getById(id, user) {
    const pr = await this.prayerRepository.findById(id);
    if (!pr) throw new NotFoundError('Pedido de oração não encontrado');
    assertSameChurch(user, pr.churchId, 'Pedido de oração não encontrado');
    return pr;
  }

  async markAnswered(id, user) {
    const pr = await this.getById(id, user);
    assertOwnerOrLeader(user, pr.userId, 'Apenas quem fez o pedido ou um líder pode marcá-lo como respondido');

    if (pr.isAnswered) return pr;

    await this.prayerRepository.update(id, { isAnswered: true });

    // Quem orou (e o autor, se não foi ele a marcar) recebe a boa notícia
    const recipients = pr.prayers.map((p) => p.userId).concat(pr.userId).filter((uid) => uid !== user.id);
    await notifyUsers(recipients, {
      type: 'prayer_answered',
      title: 'Oração respondida',
      body: preview(pr.title),
      linkId: pr.id,
      linkType: 'prayer_request',
    });

    return this.getById(id, user);
  }

  async delete(id, user) {
    const pr = await this.getById(id, user);
    assertOwnerOrLeader(user, pr.userId, 'Você só pode excluir os seus pedidos');
    return this.prayerRepository.delete(id);
  }

  async pray(id, user) {
    const pr = await this.getById(id, user);
    const already = await this.prayerRepository.hasPrayed(id, user.id);
    await this.prayerRepository.pray(id, user.id);

    if (!already && pr.userId !== user.id) {
      await notifyUser(pr.userId, {
        type: 'praying',
        title: `${user.name} está orando por você`,
        body: preview(pr.title),
        linkId: pr.id,
        linkType: 'prayer_request',
      });
    }

    return this.getById(id, user);
  }

  async unpray(id, user) {
    await this.getById(id, user);
    await this.prayerRepository.unpray(id, user.id);
    return this.getById(id, user);
  }
}

module.exports = PrayerService;
