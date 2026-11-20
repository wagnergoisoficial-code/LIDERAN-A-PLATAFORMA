const { NotFoundError, ValidationError, ForbiddenError } = require('../../../shared/errors/AppError');
const {
  requireChurch,
  assertSameChurch,
  assertOwnerOrLeader,
  assertLeader,
} = require('../../../shared/utils/church.util');
const { notifyChurch } = require('../../../shared/utils/notifier');

const MAX_OPTIONS = 6;

class PollService {
  constructor(pollRepository) {
    this.pollRepository = pollRepository;
  }

  async create(dto, user) {
    assertLeader(user, 'Apenas líderes podem criar enquetes');
    const churchId = requireChurch(user);

    const question = typeof dto.question === 'string' ? dto.question.trim() : '';
    if (question.length < 5) throw new ValidationError('A pergunta deve ter pelo menos 5 caracteres');

    const options = (Array.isArray(dto.options) ? dto.options : [])
      .map((o) => (typeof o === 'string' ? o.trim() : ''))
      .filter(Boolean);
    const unique = [...new Set(options.map((o) => o.toLowerCase()))];

    if (options.length < 2) throw new ValidationError('A enquete precisa de pelo menos 2 opções');
    if (options.length > MAX_OPTIONS) throw new ValidationError(`A enquete pode ter no máximo ${MAX_OPTIONS} opções`);
    if (unique.length !== options.length) throw new ValidationError('As opções da enquete não podem se repetir');

    let expiresAt = null;
    if (dto.expiresAt) {
      expiresAt = new Date(dto.expiresAt);
      if (Number.isNaN(expiresAt.getTime())) throw new ValidationError('Data de encerramento inválida');
      if (expiresAt <= new Date()) throw new ValidationError('A data de encerramento deve ser no futuro');
    }

    const poll = await this.pollRepository.create({ question, expiresAt, churchId, createdBy: user.id }, options);

    await notifyChurch(churchId, user.id, {
      type: 'poll_created',
      title: 'Nova enquete na comunidade',
      body: question,
      linkId: poll.id,
      linkType: 'poll',
    });

    return poll;
  }

  async getAll(user) {
    if (!user.churchId) return [];
    return this.pollRepository.findAll(user.churchId);
  }

  async getById(id, user) {
    const poll = await this.pollRepository.findById(id);
    if (!poll) throw new NotFoundError('Enquete não encontrada');
    assertSameChurch(user, poll.churchId, 'Enquete não encontrada');
    return poll;
  }

  async delete(id, user) {
    const poll = await this.getById(id, user);
    assertOwnerOrLeader(user, poll.createdBy, 'Você só pode excluir as enquetes que criou');
    return this.pollRepository.delete(id);
  }

  async vote(pollId, pollOptionId, user) {
    const poll = await this.getById(pollId, user);
    if (!poll.options.some((o) => o.id === pollOptionId)) throw new ValidationError('Opção inválida para esta enquete');
    if (poll.expiresAt && new Date(poll.expiresAt) < new Date()) throw new ForbiddenError('Esta enquete já foi encerrada');
    await this.pollRepository.vote(poll.id, pollOptionId, user.id);
    return this.getById(pollId, user);
  }
}

module.exports = PollService;
