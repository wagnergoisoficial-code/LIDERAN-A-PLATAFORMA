const express = require('express');
const CommentController = require('../modules/posts/controllers/CommentController');
const PostService = require('../modules/posts/services/PostService');
const PostRepository = require('../modules/posts/repositories/PostRepository');
const CommentRepository = require('../modules/posts/repositories/CommentRepository');
const authMiddleware = require('../shared/middlewares/auth.middleware');

// Add Comment endpoint
const addCommentRoute = express.Router();

// Initialize dependencies
const postRepository = new PostRepository();
const commentRepository = new CommentRepository();
const postService = new PostService(postRepository, commentRepository);
const commentController = new CommentController(postService);

addCommentRoute.post(
  '/:id/comment',
  authMiddleware,
  async (req, res, next) => {
    await commentController.addComment(req, res, next);
  }
);

module.exports = addCommentRoute;
