const express = require('express');
const DevotionalController = require('../modules/devotionals/controllers/DevotionalController');
const DevotionalService = require('../modules/devotionals/services/DevotionalService');
const DevotionalRepository = require('../modules/devotionals/repositories/DevotionalRepository');
const authMiddleware = require('../shared/middlewares/auth.middleware');
const roleMiddleware = require('../shared/middlewares/role.middleware');

// Create Devotional endpoint (leader only)
const createDevotionalRoute = express.Router();

// Initialize dependencies
const devotionalRepository = new DevotionalRepository();
const devotionalService = new DevotionalService(devotionalRepository);
const devotionalController = new DevotionalController(devotionalService);

createDevotionalRoute.post(
  '/',
  authMiddleware,
  roleMiddleware('leader', 'admin'),
  async (req, res, next) => {
    await devotionalController.createDevotional(req, res, next);
  }
);

module.exports = createDevotionalRoute;
