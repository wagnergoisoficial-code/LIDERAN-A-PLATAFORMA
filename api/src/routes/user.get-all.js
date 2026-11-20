const express = require('express');
const UserController = require('../modules/users/controllers/UserController');
const UserService = require('../modules/users/services/UserService');
const GetUserRepository = require('../modules/users/repositories/GetUserRepository');
const authMiddleware = require('../shared/middlewares/auth.middleware');

// GET all users endpoint
const getAllUsersRoute = express.Router();

// Initialize dependencies
const userRepository = new GetUserRepository();
const userService = new UserService(userRepository);
const userController = new UserController(userService);

getAllUsersRoute.get(
  '/',
  authMiddleware,
  async (req, res, next) => {
    await userController.getAllUsers(req, res, next);
  }
);

module.exports = getAllUsersRoute;
