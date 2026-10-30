const CreateCommentDto = require('../dtos/CreateCommentDto');

class CommentController {
  constructor(postService) {
    this.postService = postService;
  }

  async addComment(req, res, next) {
    try {
      const dto = new CreateCommentDto({
        content: req.body.content,
        postId: req.params.id,
        userId: req.user.id,
      });

      dto.validate();

      const comment = await this.postService.addComment(dto, req.user);

      res.status(201).json({
        success: true,
        message: 'Comentário adicionado',
        data: {
          id: comment.id,
          content: comment.content,
          userId: comment.user?.id,
          userName: comment.user?.name,
          userProfileImage: comment.user?.profileImage,
          createdAt: comment.createdAt,
        },
      });
    } catch (error) {
      next(error);
    }
  }

  async deleteComment(req, res, next) {
    try {
      await this.postService.deleteComment(req.params.id, req.params.commentId, req.user);
      res.json({ success: true, message: 'Comentário excluído' });
    } catch (error) {
      next(error);
    }
  }
}

module.exports = CommentController;
