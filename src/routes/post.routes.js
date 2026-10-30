const express = require('express');
const createPostRoute = require('./post.create');
const getAllPostsRoute = require('./post.get-all');
const addCommentRoute = require('./post.add-comment');
const managePostRoute = require('./post.manage');

// Post Routes aggregator
const postRoutes = express.Router();

postRoutes.use('/', createPostRoute);
postRoutes.use('/', getAllPostsRoute);
postRoutes.use('/', addCommentRoute);
postRoutes.use('/', managePostRoute);

module.exports = postRoutes;
