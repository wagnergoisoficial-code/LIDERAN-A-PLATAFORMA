// Comment Controller
class CommentController {
  constructor(postService) {
    this.postService = postService;
  }

  async addComment(req, res, next) {
    try {
      const CreateCommentDto = require('../dtos/CreateCommentDto');
      const dto = new CreateCommentDto({
        content: req.body.content,
        postId: req.params.id,
        userId: req.user.id,
      });

      dto.validate();

      const comment = await this.postService.addComment(dto);

      res.status(201).json({
        success: true,
        message: 'Comment added successfully',
        data: comment,
      });
    } catch (error) {
      next(error);
    }
  }
}

module.exports = CommentController;
