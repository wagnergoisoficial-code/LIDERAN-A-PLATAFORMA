const express = require('express');
const createPostRoute = require('./post.create');
const getAllPostsRoute = require('./post.get-all');
const addCommentRoute = require('./post.add-comment');

// Post Routes aggregator
const postRoutes = express.Router();

postRoutes.use('/', createPostRoute);
postRoutes.use('/', getAllPostsRoute);
postRoutes.use('/', addCommentRoute);

module.exports = postRoutes;
