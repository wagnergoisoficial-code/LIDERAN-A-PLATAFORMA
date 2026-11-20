const express = require('express');
const UserController = require('../modules/users/controllers/UserController');
const UserService = require('../modules/users/services/UserService');
const UserRepository = require('../modules/auth/repositories/UserRepository');
const authMiddleware = require('../shared/middlewares/auth.middleware');
const { uploadImageMiddleware } = require('../shared/middlewares/upload.middleware');

const avatarRoute = express.Router();

const userRepository = new UserRepository();
const userService = new UserService(userRepository);
const userController = new UserController(userService);

avatarRoute.put(
  '/profile/avatar',
  authMiddleware,
  uploadImageMiddleware,
  async (req, res, next) => {
    await userController.updateProfileAvatar(req, res, next);
  }
);

module.exports = avatarRoute;
