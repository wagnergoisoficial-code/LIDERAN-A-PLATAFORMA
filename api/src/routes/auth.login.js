const express = require('express');
const AuthController = require('../modules/auth/controllers/AuthController');
const AuthService = require('../modules/auth/services/AuthService');
const UserRepository = require('../modules/auth/repositories/UserRepository');

// Login endpoint
const loginRoute = express.Router();

// Initialize dependencies
const userRepository = new UserRepository();
const authService = new AuthService(userRepository);
const authController = new AuthController(authService);

loginRoute.post(
  '/',
  async (req, res, next) => {
    await authController.login(req, res, next);
  }
);

module.exports = loginRoute;
