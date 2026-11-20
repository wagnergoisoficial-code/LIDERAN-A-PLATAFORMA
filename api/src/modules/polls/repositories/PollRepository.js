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
      take: 50,
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

  // Cada pessoa tem um único voto por enquete (trocar de opção substitui o voto anterior)
  async vote(pollId, pollOptionId, userId) {
    const options = await this.prisma.pollOption.findMany({ where: { pollId }, select: { id: true } });
    return this.prisma.$transaction([
      this.prisma.pollVote.deleteMany({ where: { pollOptionId: { in: options.map(o => o.id) }, userId } }),
      this.prisma.pollVote.create({ data: { pollOptionId, userId } }),
    ]);
  }
}

module.exports = PollRepository;
