const express = require('express');
const UserController = require('../modules/users/controllers/UserController');
const UserService = require('../modules/users/services/UserService');
const UserRepository = require('../modules/auth/repositories/UserRepository');
const authMiddleware = require('../shared/middlewares/auth.middleware');

// Block/Unblock endpoints
const blockRoute = express.Router();

// Initialize dependencies
const userRepository = new UserRepository();
const userService = new UserService(userRepository);
const userController = new UserController(userService);

// Get blocked users
blockRoute.get(
  '/blocked',
  authMiddleware,
  async (req, res, next) => {
    await userController.getBlockedUsers(req, res, next);
  }
);

// Block a user
blockRoute.post(
  '/block/:blockedId',
  authMiddleware,
  async (req, res, next) => {
    await userController.blockUser(req, res, next);
  }
);

// Unblock a user
blockRoute.delete(
  '/block/:blockedId',
  authMiddleware,
  async (req, res, next) => {
    await userController.unblockUser(req, res, next);
  }
);

module.exports = blockRoute;
