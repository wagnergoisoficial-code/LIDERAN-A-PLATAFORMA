const { NotFoundError, ValidationError } = require('../../../shared/errors/AppError');
const {
  requireChurch,
  assertSameChurch,
  assertOwnerOrLeader,
  assertLeader,
} = require('../../../shared/utils/church.util');
const { notifyChurch, notifyUser, preview } = require('../../../shared/utils/notifier');
const { pageSize } = require('../../../shared/utils/query.util');

const REACTION_TYPES = ['amen', 'praying', 'heart', 'fire', 'strong'];

class PostService {
  constructor(postRepository, commentRepository) {
    this.postRepository = postRepository;
    this.commentRepository = commentRepository;
  }

  async createPost(createPostDto, user) {
    const churchId = requireChurch(user);

    const post = await this.postRepository.create({
      content: createPostDto.content,
      imageUrl: createPostDto.imageUrl,
      userId: user.id,
      churchId,
    });

    await notifyChurch(churchId, user.id, {
      type: 'new_post',
      title: `${user.name} publicou no feed`,
      body: preview(post.content) || 'Nova imagem compartilhada',
      linkId: post.id,
      linkType: 'post',
    });

    return post;
  }

  // Feed paginado: a primeira página traz também as publicações fixadas
  async getAllPosts(user, { cursor, limit } = {}) {
    if (!user.churchId) return { posts: [], nextCursor: null };
    const hidden = await this.postRepository.blockedIds(user.id);
    return this.postRepository.findPage(user.churchId, hidden, { cursor, limit: pageSize(limit) });
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
