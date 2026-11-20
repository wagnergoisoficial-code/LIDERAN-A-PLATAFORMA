const express = require('express');
const DevotionalController = require('../modules/devotionals/controllers/DevotionalController');
const DevotionalService = require('../modules/devotionals/services/DevotionalService');
const DevotionalRepository = require('../modules/devotionals/repositories/DevotionalRepository');
const authMiddleware = require('../shared/middlewares/auth.middleware');
const roleMiddleware = require('../shared/middlewares/role.middleware');

const createDevotionalRoute = express.Router();

const devotionalRepository = new DevotionalRepository();
const devotionalService = new DevotionalService(devotionalRepository);
const devotionalController = new DevotionalController(devotionalService);

createDevotionalRoute.post(
  '/',
  authMiddleware,
  roleMiddleware('leader', 'admin'),
  (req, res, next) => devotionalController.createDevotional(req, res, next)
);

module.exports = createDevotionalRoute;
