const CreatePostDto = require('../dtos/CreatePostDto');

class PostController {
  constructor(postService) {
    this.postService = postService;
  }

  formatPostForResponse(post, userId) {
    const reactionTypes = ['amen', 'praying', 'heart', 'fire', 'strong'];
    const reactionCounts = {};
    reactionTypes.forEach((t) => {
      reactionCounts[t] = post.reactions?.filter((r) => r.type === t).length || 0;
    });
    return {
      id: post.id,
      content: post.content,
      imageUrl: post.imageUrl,
      isPinned: post.isPinned || false,
      type: post.type || 'post',
      userId: post.user?.id,
      userName: post.user?.name,
      userProfileImage: post.user?.profileImage,
      createdAt: post.createdAt,
      reactions: reactionCounts,
      myReactions: post.reactions?.filter((r) => r.userId === userId).map((r) => r.type) || [],
      comments: post.comments?.map((comment) => this.formatComment(comment)) || [],
    };
  }

  formatComment(comment) {
    return {
      id: comment.id,
      content: comment.content,
      userId: comment.user?.id,
      userName: comment.user?.name,
      userProfileImage: comment.user?.profileImage,
      createdAt: comment.createdAt,
    };
  }

  async createPost(req, res, next) {
    try {
      const dto = new CreatePostDto({
        content: req.body.content,
        imageUrl: req.body.imageUrl,
        userId: req.user.id,
      });

      dto.validate();

      const post = await this.postService.createPost(dto, req.user);

      res.status(201).json({
        success: true,
        message: 'Publicação criada',
        data: this.formatPostForResponse(post, req.user.id),
      });
    } catch (error) {
      next(error);
    }
  }

  async getAllPosts(req, res, next) {
    try {
      const posts = await this.postService.getAllPosts(req.user);

      res.status(200).json({
        success: true,
        data: posts.map((post) => this.formatPostForResponse(post, req.user.id)),
      });
    } catch (error) {
      next(error);
    }
  }

  async getPostById(req, res, next) {
    try {
      const post = await this.postService.getPostById(req.params.id, req.user);
      res.status(200).json({ success: true, data: this.formatPostForResponse(post, req.user.id) });
    } catch (error) {
      next(error);
    }
  }

  async deletePost(req, res, next) {
    try {
      await this.postService.deletePost(req.params.id, req.user);
      res.json({ success: true, message: 'Publicação excluída' });
    } catch (error) {
      next(error);
    }
  }

  async togglePin(req, res, next) {
    try {
      const isPinned = !!req.body.isPinned;
      await this.postService.togglePin(req.params.id, isPinned, req.user);
      res.json({ success: true, message: isPinned ? 'Publicação fixada' : 'Publicação desafixada' });
    } catch (error) {
      next(error);
    }
  }

  async react(req, res, next) {
    try {
      await this.postService.reactToPost(req.params.id, req.user, req.body.type);
      res.json({ success: true, message: 'Reação adicionada' });
    } catch (error) {
      next(error);
    }
  }

  async unreact(req, res, next) {
    try {
      await this.postService.removeReaction(req.params.id, req.user, req.body.type);
      res.json({ success: true, message: 'Reação removida' });
    } catch (error) {
      next(error);
    }
  }
}

module.exports = PostController;
