const express = require('express');
const DevotionalController = require('../modules/devotionals/controllers/DevotionalController');
const DevotionalService = require('../modules/devotionals/services/DevotionalService');
const DevotionalRepository = require('../modules/devotionals/repositories/DevotionalRepository');
const UserRepository = require('../modules/auth/repositories/UserRepository');
const authMiddleware = require('../shared/middlewares/auth.middleware');
const roleMiddleware = require('../shared/middlewares/role.middleware');

const createDevotionalRoute = express.Router();

const devotionalRepository = new DevotionalRepository();
const devotionalService = new DevotionalService(devotionalRepository);
const devotionalController = new DevotionalController(devotionalService);
const userRepository = new UserRepository();

createDevotionalRoute.post(
  '/',
  authMiddleware,
  roleMiddleware('leader', 'admin'),
  async (req, res, next) => {
    try {
      if (!req.user.churchId) {
        const user = await userRepository.findById(req.user.id);
        if (user?.churchId) req.user.churchId = user.churchId;
      }
      await devotionalController.createDevotional(req, res, next);
    } catch (error) {
      next(error);
    }
  }
);

module.exports = createDevotionalRoute;
