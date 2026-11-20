const express = require('express');
const UserController = require('../modules/users/controllers/UserController');
const UserService = require('../modules/users/services/UserService');
const UserRepository = require('../modules/auth/repositories/UserRepository');
const authMiddleware = require('../shared/middlewares/auth.middleware');

// Update profile endpoint
const updateProfileRoute = express.Router();

// Initialize dependencies
const userRepository = new UserRepository();
const userService = new UserService(userRepository);
const userController = new UserController(userService);

updateProfileRoute.put(
  '/profile',
  authMiddleware,
  async (req, res, next) => {
    await userController.updateProfile(req, res, next);
  }
);

module.exports = updateProfileRoute;
