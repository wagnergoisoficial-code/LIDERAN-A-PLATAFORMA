const express = require('express');
const DevotionalController = require('../modules/devotionals/controllers/DevotionalController');
const DevotionalService = require('../modules/devotionals/services/DevotionalService');
const DevotionalRepository = require('../modules/devotionals/repositories/DevotionalRepository');
const authMiddleware = require('../shared/middlewares/auth.middleware');
const roleMiddleware = require('../shared/middlewares/role.middleware');

// Mark devotional as inactive
const markInactiveRoute = express.Router();

// Initialize dependencies
const devotionalRepository = new DevotionalRepository();
const devotionalService = new DevotionalService(devotionalRepository);
const devotionalController = new DevotionalController(devotionalService);

markInactiveRoute.put(
  '/:id/inactive',
  authMiddleware,
  roleMiddleware('leader', 'admin'),
  async (req, res, next) => {
    await devotionalController.markAsInactive(req, res, next);
  }
);

// Reactivate devotional
markInactiveRoute.put(
  '/:id/reactivate',
  authMiddleware,
  roleMiddleware('leader', 'admin'),
  async (req, res, next) => {
    await devotionalController.reactivateDevotional(req, res, next);
  }
);

module.exports = markInactiveRoute;
