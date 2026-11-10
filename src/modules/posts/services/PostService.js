const { NotFoundError, ValidationError, ForbiddenError } = require('../../../shared/errors/AppError');
const { isMinor } = require('../../../shared/utils/minor.util');
const {
  requireChurch,
  assertSameChurch,
  assertOwnerOrLeader,
  assertLeader,
} = require('../../../shared/utils/church.util');
const { notifyChurch, notifyUser, preview } = require('../../../shared/utils/notifier');
const { pageSize } = require('../../../shared/utils/query.util');
const { dueBirthdays } = require('../../../shared/utils/birthday.util');

const REACTION_TYPES = ['amen', 'praying', 'heart', 'fire', 'strong'];

class PostService {
  constructor(postRepository, commentRepository) {
    this.postRepository = postRepository;
    this.commentRepository = commentRepository;
  }

  async createPost(createPostDto, user) {
    const churchId = requireChurch(user);
    const donation = createPostDto.isDonation;

    // A doação mostra o local a todas as comunidades: um menor não pode expor onde está
    if (donation && isMinor(user)) {
      throw new ForbiddenError('Menores de idade não podem publicar doações. Peça ajuda ao seu responsável ou ao líder.');
    }

    const post = await this.postRepository.create({
      content: createPostDto.content,
      imageUrl: createPostDto.imageUrl,
      userId: user.id,
      churchId,
      background: createPostDto.background,
      ...(donation && {
        type: 'donation',
        location: createPostDto.location,
        latitude: createPostDto.latitude,
        longitude: createPostDto.longitude,
      }),
    });

    await notifyChurch(churchId, user.id, {
      type: 'new_post',
      title: donation ? `${user.name} publicou uma doação` : `${user.name} publicou no feed`,
      body: preview(post.content) || 'Nova imagem compartilhada',
      linkId: post.id,
      linkType: 'post',
    });

    return post;
  }

  // Feed paginado: a primeira página traz também as publicações fixadas
  async getAllPosts(user, { cursor, limit } = {}) {
    if (!user.churchId) return { posts: [], nextCursor: null };
    if (!cursor) await this.publishBirthdays(user.churchId);
    const [hidden, leaderIds] = await Promise.all([
      this.postRepository.blockedIds(user.id),
      this.postRepository.leaderIds(user.churchId),
    ]);
    return this.postRepository.findPage(user.churchId, hidden, { cursor, limit: pageSize(limit), leaderIds });
  }

  // Na véspera, a plataforma avisa no feed quem faz anos (sem cron: corre quando alguém abre o feed)
  async publishBirthdays(churchId) {
    const due = dueBirthdays(await this.postRepository.birthdayMembers(churchId));
    for (const { member, year, tomorrow } of due) {
      await this.postRepository.createBirthdayPost({
        userId: member.id,
        churchId,
        year,
        content: `${tomorrow ? 'Amanhã' : 'Hoje'} é aniversário de ${member.name}! 🎂 Deixe sua mensagem de parabéns.`,
      });
    }
  }

  async getPostById(id, user) {
    const hidden = user ? await this.postRepository.blockedIds(user.id) : [];
    const post = await this.postRepository.findById(id, hidden);

    if (!post) {
      throw new NotFoundError('Publicação não encontrada');
    }

    if (user) assertSameChurch(user, post.churchId, 'Publicação não encontrada');

    return post;
  }

  async addComment(createCommentDto, user) {
    const post = await this.getPostById(createCommentDto.postId, user);

    const comment = await this.commentRepository.create({
      content: createCommentDto.content,
      postId: post.id,
      userId: user.id,
    });

    if (post.userId !== user.id) {
      await notifyUser(post.userId, {
        type: 'new_comment',
        title: `${user.name} comentou sua publicação`,
        body: preview(comment.content),
        linkId: post.id,
        linkType: 'post',
      });
    }

    return comment;
  }

  async deleteComment(postId, commentId, user) {
    const comment = await this.commentRepository.findById(commentId);

    if (!comment || comment.postId !== postId) {
      throw new NotFoundError('Comentário não encontrado');
    }

    assertSameChurch(user, comment.post.churchId, 'Comentário não encontrado');
    assertOwnerOrLeader(user, comment.userId, 'Você só pode excluir os seus comentários');

    return this.commentRepository.delete(commentId);
  }

  async deletePost(id, user) {
    const post = await this.getPostById(id, user);
    assertOwnerOrLeader(user, post.userId, 'Você só pode excluir as suas publicações');
    return this.postRepository.delete(id);
  }

  // Só quem doa (ou um líder da comunidade dele) marca a doação como entregue
  async setDonated(id, donated, user) {
    const post = await this.getPostById(id, user);
    if (post.type !== 'donation') throw new ValidationError('Esta publicação não é uma doação');
    assertOwnerOrLeader(user, post.userId, 'Só quem publicou a doação a pode marcar como doada');
    return this.postRepository.update(id, { donatedAt: donated ? new Date() : null });
  }

  async togglePin(id, isPinned, user) {
    assertLeader(user, 'Apenas líderes podem fixar publicações');
    await this.getPostById(id, user);
    return this.postRepository.togglePin(id, isPinned);
  }

  async reactToPost(postId, user, type) {
    if (!REACTION_TYPES.includes(type)) {
      throw new ValidationError('Reação inválida');
    }

    const post = await this.getPostById(postId, user);
    const previous = await this.postRepository.countUserReactions(postId, user.id);
    const reaction = await this.postRepository.upsertReaction(postId, user.id, type);

    // Só a primeira reação de cada pessoa gera notificação
    if (previous === 0 && post.userId !== user.id) {
      await notifyUser(post.userId, {
        type: 'reaction',
        title: `${user.name} reagiu à sua publicação`,
        body: preview(post.content) || 'Sua imagem recebeu uma reação',
        linkId: post.id,
        linkType: 'post',
      });
    }

    return reaction;
  }

  async removeReaction(postId, user, type) {
    if (!REACTION_TYPES.includes(type)) {
      throw new ValidationError('Reação inválida');
    }

    await this.getPostById(postId, user);
    return this.postRepository.deleteReaction(postId, user.id, type);
  }
}

PostService.REACTION_TYPES = REACTION_TYPES;

module.exports = PostService;
