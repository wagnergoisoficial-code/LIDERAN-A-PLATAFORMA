const express = require('express');
const UserController = require('../modules/users/controllers/UserController');
const UserService = require('../modules/users/services/UserService');
const UserRepository = require('../modules/auth/repositories/UserRepository');
const authMiddleware = require('../shared/middlewares/auth.middleware');

// Achievements endpoints
const achievementsRoute = express.Router();

// Initialize dependencies
const userRepository = new UserRepository();
const userService = new UserService(userRepository);
const userController = new UserController(userService);

// Get achievements for a user
achievementsRoute.get(
  '/:id/achievements',
  authMiddleware,
  async (req, res, next) => {
    await userController.getAchievements(req, res, next);
  }
);

module.exports = achievementsRoute;
