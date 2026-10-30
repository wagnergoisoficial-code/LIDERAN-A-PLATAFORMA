const express = require('express');
const PostController = require('../modules/posts/controllers/PostController');
const PostService = require('../modules/posts/services/PostService');
const PostRepository = require('../modules/posts/repositories/PostRepository');
const CommentRepository = require('../modules/posts/repositories/CommentRepository');
const authMiddleware = require('../shared/middlewares/auth.middleware');

const postReactionRoute = express.Router();

const postRepository = new PostRepository();
const commentRepository = new CommentRepository();
const postService = new PostService(postRepository, commentRepository);
const postController = new PostController(postService);

postReactionRoute.post('/:id/react', authMiddleware, (req, res, next) => postController.react(req, res, next));
postReactionRoute.delete('/:id/react', authMiddleware, (req, res, next) => postController.unreact(req, res, next));
postReactionRoute.patch('/:id/pin', authMiddleware, (req, res, next) => postController.togglePin(req, res, next));

module.exports = postReactionRoute;
