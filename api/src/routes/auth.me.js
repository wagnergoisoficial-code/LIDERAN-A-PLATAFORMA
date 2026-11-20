const express = require('express');
const AuthController = require('../modules/auth/controllers/AuthController');
const AuthService = require('../modules/auth/services/AuthService');
const UserRepository = require('../modules/auth/repositories/UserRepository');
const authMiddleware = require('../shared/middlewares/auth.middleware');

// Current user endpoint (dados atuais + token renovado)
const meRoute = express.Router();

const userRepository = new UserRepository();
const authService = new AuthService(userRepository);
const authController = new AuthController(authService);

meRoute.get('/', authMiddleware, (req, res, next) => authController.me(req, res, next));

module.exports = meRoute;
