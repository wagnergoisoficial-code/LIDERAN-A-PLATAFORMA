class PollController {
  constructor(pollService) {
    this.pollService = pollService;
  }

  format(poll, userId) {
    const totalVotes = poll.options.reduce((s, o) => s + o.votes.length, 0);
    return {
      id: poll.id,
      question: poll.question,
      expiresAt: poll.expiresAt,
      createdBy: poll.createdBy,
      createdAt: poll.createdAt,
      totalVotes,
      options: poll.options.map(o => ({
        id: o.id,
        text: o.text,
        votes: o.votes.length,
        percentage: totalVotes > 0 ? Math.round((o.votes.length / totalVotes) * 100) : 0,
        hasVoted: o.votes.some(v => v.userId === userId),
      })),
      myVoteOptionId: poll.options.find(o => o.votes.some(v => v.userId === userId))?.id || null,
      isExpired: !!poll.expiresAt && new Date(poll.expiresAt) < new Date(),
    };
  }

  async create(req, res, next) {
    try {
      const poll = await this.pollService.create(req.body, req.user);
      res.status(201).json({ success: true, message: 'Enquete criada', data: this.format(poll, req.user.id) });
    } catch (e) { next(e); }
  }

  async getAll(req, res, next) {
    try {
      const polls = await this.pollService.getAll(req.user);
      res.json({ success: true, data: polls.map(p => this.format(p, req.user.id)) });
    } catch (e) { next(e); }
  }

  async remove(req, res, next) {
    try {
      await this.pollService.delete(req.params.id, req.user);
      res.json({ success: true, message: 'Enquete excluída' });
    } catch (e) { next(e); }
  }

  async vote(req, res, next) {
    try {
      const poll = await this.pollService.vote(req.params.id, req.body.optionId, req.user);
      res.json({ success: true, message: 'Voto registrado', data: this.format(poll, req.user.id) });
    } catch (e) { next(e); }
  }
}

module.exports = PollController;
