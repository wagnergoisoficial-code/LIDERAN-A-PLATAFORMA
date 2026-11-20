const express = require('express');
const AuthController = require('../modules/auth/controllers/AuthController');
const AuthService = require('../modules/auth/services/AuthService');
const UserRepository = require('../modules/auth/repositories/UserRepository');

// Register endpoint
const registerRoute = express.Router();

// Initialize dependencies
const userRepository = new UserRepository();
const authService = new AuthService(userRepository);
const authController = new AuthController(authService);

registerRoute.post(
  '/',
  async (req, res, next) => {
    await authController.register(req, res, next);
  }
);

module.exports = registerRoute;
