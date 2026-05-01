const express = require('express');
const createDevotionalRoute = require('./devotional.create');
const getAllDevotionalsRoute = require('./devotional.get-all');
const markInactiveRoute = require('./devotional.inactive');

// Devotional Routes aggregator
const devotionalRoutes = express.Router();

devotionalRoutes.use('/', createDevotionalRoute);
devotionalRoutes.use('/', getAllDevotionalsRoute);
devotionalRoutes.use('/', markInactiveRoute);

module.exports = devotionalRoutes;
