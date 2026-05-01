const express = require('express');
const PostController = require('../modules/posts/controllers/PostController');
const PostService = require('../modules/posts/services/PostService');
const PostRepository = require('../modules/posts/repositories/PostRepository');
const CommentRepository = require('../modules/posts/repositories/CommentRepository');
const authMiddleware = require('../shared/middlewares/auth.middleware');

// Get All Posts endpoint
const getAllPostsRoute = express.Router();

// Initialize dependencies
const postRepository = new PostRepository();
const commentRepository = new CommentRepository();
const postService = new PostService(postRepository, commentRepository);
const postController = new PostController(postService);

getAllPostsRoute.get(
  '/',
  authMiddleware,
  async (req, res, next) => {
    await postController.getAllPosts(req, res, next);
  }
);

module.exports = getAllPostsRoute;
