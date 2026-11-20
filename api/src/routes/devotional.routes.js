const express = require('express');
const createDevotionalRoute = require('./devotional.create');
const getAllDevotionalsRoute = require('./devotional.get-all');
const markInactiveRoute = require('./devotional.inactive');
const devotionalLikeRoute = require('./devotional.like');

const devotionalRoutes = express.Router();

devotionalRoutes.use('/', createDevotionalRoute);
devotionalRoutes.use('/', getAllDevotionalsRoute);
devotionalRoutes.use('/', markInactiveRoute);
devotionalRoutes.use('/', devotionalLikeRoute);

module.exports = devotionalRoutes;
