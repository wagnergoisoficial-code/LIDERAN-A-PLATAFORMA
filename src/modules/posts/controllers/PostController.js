// Post Controller
class PostController {
  constructor(postService) {
    this.postService = postService;
  }

  formatPostForResponse(post, userId) {
    const reactionTypes = ['amen', 'praying', 'heart', 'fire', 'strong'];
    const reactionCounts = {};
    reactionTypes.forEach(t => { reactionCounts[t] = post.reactions?.filter(r => r.type === t).length || 0; });
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
      myReactions: post.reactions?.filter(r => r.userId === userId).map(r => r.type) || [],
      comments: post.comments?.map(comment => ({
        id: comment.id,
        content: comment.content,
        userId: comment.user?.id,
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
        data: this.formatPostForResponse(post, req.user.id),
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
        data: posts.map(post => this.formatPostForResponse(post, req.user.id)),
      });
    } catch (error) {
      next(error);
    }
  }

  async getPostById(req, res, next) {
    try {
      const post = await this.postService.getPostById(req.params.id);
      res.status(200).json({ success: true, message: 'Post retrieved successfully', data: this.formatPostForResponse(post, req.user.id) });
    } catch (error) {
      next(error);
    }
  }

  async togglePin(req, res, next) {
    try {
      const { isPinned } = req.body;
      await this.postService.togglePin(req.params.id, !!isPinned);
      res.json({ success: true, message: isPinned ? 'Post pinned' : 'Post unpinned' });
    } catch (error) {
      next(error);
    }
  }

  async react(req, res, next) {
    try {
      const { type } = req.body;
      await this.postService.reactToPost(req.params.id, req.user.id, type);
      res.json({ success: true, message: 'Reaction added' });
    } catch (error) {
      next(error);
    }
  }

  async unreact(req, res, next) {
    try {
      const { type } = req.body;
      await this.postService.removeReaction(req.params.id, req.user.id, type);
      res.json({ success: true, message: 'Reaction removed' });
    } catch (error) {
      next(error);
    }
  }
}

module.exports = PostController;
