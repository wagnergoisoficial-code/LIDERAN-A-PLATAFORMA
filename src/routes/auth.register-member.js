const express = require('express');
const AuthController = require('../modules/auth/controllers/AuthController');
const AuthService = require('../modules/auth/services/AuthService');
const UserRepository = require('../modules/auth/repositories/UserRepository');
const authMiddleware = require('../shared/middlewares/auth.middleware');

// Register member endpoint (for leaders)
const registerMemberRoute = express.Router();

// Initialize dependencies
const userRepository = new UserRepository();
const authService = new AuthService(userRepository);
const authController = new AuthController(authService);

registerMemberRoute.post(
  '/',
  authMiddleware,
  async (req, res, next) => {
    await authController.registerMember(req, res, next);
  }
);

module.exports = registerMemberRoute;
