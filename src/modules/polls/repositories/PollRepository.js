const { getPrismaClient } = require('../../../config/database');

class PollRepository {
  constructor() {
    this.prisma = getPrismaClient();
  }

  async create(data, options) {
    return this.prisma.poll.create({
      data: {
        ...data,
        options: { create: options.map(text => ({ text })) },
      },
      include: { options: { include: { votes: true } } },
    });
  }

  async findAll(churchId) {
    return this.prisma.poll.findMany({
      where: { churchId },
      include: { options: { include: { votes: true } } },
      orderBy: { createdAt: 'desc' },
    });
  }

  async findById(id) {
    return this.prisma.poll.findUnique({
      where: { id },
      include: { options: { include: { votes: true } } },
    });
  }

  async delete(id) {
    return this.prisma.poll.delete({ where: { id } });
  }

  async vote(pollOptionId, userId) {
    // Remove existing votes from this user for this poll
    const option = await this.prisma.pollOption.findUnique({ where: { id: pollOptionId } });
    const otherOptions = await this.prisma.pollOption.findMany({ where: { pollId: option.pollId } });
    await this.prisma.pollVote.deleteMany({
      where: { pollOptionId: { in: otherOptions.map(o => o.id) }, userId },
    });
    return this.prisma.pollVote.create({ data: { pollOptionId, userId } });
  }
}

module.exports = PollRepository;
