// Post Controller
class PostController {
  constructor(postService) {
    this.postService = postService;
  }

  formatPostForResponse(post) {
    return {
      id: post.id,
      content: post.content,
      imageUrl: post.imageUrl,
      userName: post.user?.name,
      userProfileImage: post.user?.profileImage,
      createdAt: post.createdAt,
      comments: post.comments?.map(comment => ({
        id: comment.id,
        content: comment.content,
        userName: comment.user?.name,
        userProfileImage: comment.user?.profileImage,
        createdAt: comment.createdAt,
      })) || [],
    };
  }

  async createPost(req, res, next) {
    try {
      const CreatePostDto = require('../dtos/CreatePostDto');
      const dto = new CreatePostDto({
        content: req.body.content,
        imageUrl: req.body.imageUrl,
        userId: req.user.id,
        churchId: req.user.churchId,
      });

      dto.validate();

      const post = await this.postService.createPost(dto);

      res.status(201).json({
        success: true,
        message: 'Post created successfully',
        data: this.formatPostForResponse(post),
      });
    } catch (error) {
      next(error);
    }
  }

  async getAllPosts(req, res, next) {
    try {
      const posts = await this.postService.getAllPosts(req.user.churchId);

      res.status(200).json({
        success: true,
        message: 'Posts retrieved successfully',
        data: posts.map(post => this.formatPostForResponse(post)),
      });
    } catch (error) {
      next(error);
    }
  }

  async getPostById(req, res, next) {
    try {
      const post = await this.postService.getPostById(req.params.id);

      res.status(200).json({
        success: true,
        message: 'Post retrieved successfully',
        data: this.formatPostForResponse(post),
      });
    } catch (error) {
      next(error);
    }
  }
}

module.exports = PostController;
