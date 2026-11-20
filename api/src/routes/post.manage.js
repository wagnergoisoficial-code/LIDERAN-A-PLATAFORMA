const express = require('express');
const PostController = require('../modules/posts/controllers/PostController');
const CommentController = require('../modules/posts/controllers/CommentController');
const PostService = require('../modules/posts/services/PostService');
const PostRepository = require('../modules/posts/repositories/PostRepository');
const CommentRepository = require('../modules/posts/repositories/CommentRepository');
const authMiddleware = require('../shared/middlewares/auth.middleware');

// Get / delete posts and delete comments
const managePostRoute = express.Router();

const postService = new PostService(new PostRepository(), new CommentRepository());
const postController = new PostController(postService);
const commentController = new CommentController(postService);

managePostRoute.get('/:id', authMiddleware, (req, res, next) => postController.getPostById(req, res, next));
managePostRoute.delete('/:id', authMiddleware, (req, res, next) => postController.deletePost(req, res, next));
managePostRoute.delete('/:id/comments/:commentId', authMiddleware, (req, res, next) =>
  commentController.deleteComment(req, res, next)
);

module.exports = managePostRoute;
