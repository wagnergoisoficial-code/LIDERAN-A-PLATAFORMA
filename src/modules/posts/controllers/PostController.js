// Post Controller
class PostController {
  constructor(postService) {
    this.postService = postService;
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
        data: post,
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
        data: posts,
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
        data: post,
      });
    } catch (error) {
      next(error);
    }
  }
}

module.exports = PostController;
