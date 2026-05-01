const express = require('express');
const UserController = require('../modules/users/controllers/UserController');
const UserService = require('../modules/users/services/UserService');
const UserRepository = require('../modules/auth/repositories/UserRepository');
const authMiddleware = require('../shared/middlewares/auth.middleware');
const roleMiddleware = require('../shared/middlewares/role.middleware');

// Create User endpoint (leader/admin only)
const createUserRoute = express.Router();

// Initialize dependencies
const userRepository = new UserRepository();
const userService = new UserService(userRepository);
const userController = new UserController(userService);

createUserRoute.post(
  '/',
  authMiddleware,
  roleMiddleware('leader', 'admin'),
  async (req, res, next) => {
    await userController.createUser(req, res, next);
  }
);

module.exports = createUserRoute;
