const express = require('express');
const SermonController = require('../modules/sermons/controllers/SermonController');
const SermonService = require('../modules/sermons/services/SermonService');
const SermonRepository = require('../modules/sermons/repositories/SermonRepository');
const authMiddleware = require('../shared/middlewares/auth.middleware');

const sermonRoutes = express.Router();
const controller = new SermonController(new SermonService(new SermonRepository()));

sermonRoutes.get('/', authMiddleware, (req, res, next) => controller.getAll(req, res, next));
sermonRoutes.post('/', authMiddleware, (req, res, next) => controller.create(req, res, next));
sermonRoutes.get('/:id', authMiddleware, (req, res, next) => controller.getById(req, res, next));
sermonRoutes.put('/:id', authMiddleware, (req, res, next) => controller.update(req, res, next));
sermonRoutes.delete('/:id', authMiddleware, (req, res, next) => controller.remove(req, res, next));

module.exports = sermonRoutes;
