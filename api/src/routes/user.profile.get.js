const express = require('express');
const UserController = require('../modules/users/controllers/UserController');
const UserService = require('../modules/users/services/UserService');
const UserRepository = require('../modules/auth/repositories/UserRepository');
const authMiddleware = require('../shared/middlewares/auth.middleware');

// Get profile endpoint
const getProfileRoute = express.Router();

// Initialize dependencies
const userRepository = new UserRepository();
const userService = new UserService(userRepository);
const userController = new UserController(userService);

getProfileRoute.get(
  '/:id',
  authMiddleware,
  async (req, res, next) => {
    await userController.getProfile(req, res, next);
  }
);

module.exports = getProfileRoute;
