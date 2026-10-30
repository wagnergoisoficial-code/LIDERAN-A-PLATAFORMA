const express = require('express');
const DevotionalController = require('../modules/devotionals/controllers/DevotionalController');
const DevotionalService = require('../modules/devotionals/services/DevotionalService');
const DevotionalRepository = require('../modules/devotionals/repositories/DevotionalRepository');
const authMiddleware = require('../shared/middlewares/auth.middleware');
const roleMiddleware = require('../shared/middlewares/role.middleware');

const devotionalLikeRoute = express.Router();
const devotionalController = new DevotionalController(new DevotionalService(new DevotionalRepository()));

// Curtir / descurtir (alterna)
devotionalLikeRoute.post('/:id/like', authMiddleware, (req, res, next) => devotionalController.toggleLike(req, res, next));

// Excluir devocional
devotionalLikeRoute.delete('/:id', authMiddleware, roleMiddleware('leader', 'admin'), (req, res, next) =>
  devotionalController.deleteDevotional(req, res, next)
);

module.exports = devotionalLikeRoute;
