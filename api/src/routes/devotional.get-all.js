const express = require('express');
const DevotionalController = require('../modules/devotionals/controllers/DevotionalController');
const DevotionalService = require('../modules/devotionals/services/DevotionalService');
const DevotionalRepository = require('../modules/devotionals/repositories/DevotionalRepository');
const authMiddleware = require('../shared/middlewares/auth.middleware');

const getAllDevotionalsRoute = express.Router();

const devotionalRepository = new DevotionalRepository();
const devotionalService = new DevotionalService(devotionalRepository);
const devotionalController = new DevotionalController(devotionalService);

getAllDevotionalsRoute.get(
  '/',
  authMiddleware,
  (req, res, next) => devotionalController.getAllDevotionals(req, res, next)
);

module.exports = getAllDevotionalsRoute;
