const express = require('express');
const UserController = require('../modules/users/controllers/UserController');
const UserService = require('../modules/users/services/UserService');
const UserRepository = require('../modules/auth/repositories/UserRepository');
const authMiddleware = require('../shared/middlewares/auth.middleware');

// Social links endpoints
const socialLinksRoute = express.Router();

// Initialize dependencies
const userRepository = new UserRepository();
const userService = new UserService(userRepository);
const userController = new UserController(userService);

// Get social links for a user
socialLinksRoute.get(
  '/:id/social-links',
  authMiddleware,
  async (req, res, next) => {
    await userController.getSocialLinks(req, res, next);
  }
);

// Add social link to current user
socialLinksRoute.post(
  '/social-links',
  authMiddleware,
  async (req, res, next) => {
    await userController.addSocialLink(req, res, next);
  }
);

// Remove social link
socialLinksRoute.delete(
  '/social-links/:linkId',
  authMiddleware,
  async (req, res, next) => {
    await userController.removeSocialLink(req, res, next);
  }
);

module.exports = socialLinksRoute;
