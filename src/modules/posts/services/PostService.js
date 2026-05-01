const { NotFoundError } = require('../../../shared/errors/AppError');

// Post Service
class PostService {
  constructor(postRepository, commentRepository) {
    this.postRepository = postRepository;
    this.commentRepository = commentRepository;
  }

  async createPost(createPostDto) {
    return await this.postRepository.create({
      content: createPostDto.content,
      imageUrl: createPostDto.imageUrl,
      userId: createPostDto.userId,
      churchId: createPostDto.churchId,
    });
  }

  async getAllPosts(churchId) {
    return await this.postRepository.findAll(churchId);
  }

  async getPostById(id) {
    const post = await this.postRepository.findById(id);

    if (!post) {
      throw new NotFoundError('Post not found');
    }

    return post;
  }

  async addComment(createCommentDto) {
    // Verify post exists
    const post = await this.postRepository.findById(createCommentDto.postId);
    if (!post) {
      throw new NotFoundError('Post not found');
    }

    return await this.commentRepository.create({
      content: createCommentDto.content,
      postId: createCommentDto.postId,
      userId: createCommentDto.userId,
    });
  }

  async deletePost(id) {
    await this.getPostById(id);
    return await this.postRepository.delete(id);
  }
}

module.exports = PostService;
