const { NotFoundError, ForbiddenError } = require('../../../shared/errors/AppError');

class PollService {
  constructor(pollRepository) {
    this.pollRepository = pollRepository;
  }

  async create(dto) {
    return this.pollRepository.create(
      {
        question: dto.question,
        expiresAt: dto.expiresAt ? new Date(dto.expiresAt) : null,
        churchId: dto.churchId,
        createdBy: dto.userId,
      },
      dto.options
    );
  }

  async getAll(churchId) {
    return this.pollRepository.findAll(churchId);
  }

  async getById(id) {
    const poll = await this.pollRepository.findById(id);
    if (!poll) throw new NotFoundError('Poll not found');
    return poll;
  }

  async delete(id, userId, role) {
    const poll = await this.getById(id);
    if (poll.createdBy !== userId && role !== 'admin') throw new ForbiddenError('Not authorized');
    return this.pollRepository.delete(id);
  }

  async vote(pollId, pollOptionId, userId) {
    const poll = await this.getById(pollId);
    const validOption = poll.options.some(o => o.id === pollOptionId);
    if (!validOption) throw new NotFoundError('Option not found in this poll');
    if (poll.expiresAt && new Date(poll.expiresAt) < new Date()) throw new ForbiddenError('Poll has expired');
    return this.pollRepository.vote(pollOptionId, userId);
  }
}

module.exports = PollService;
