const express = require('express');
const GroupController = require('../modules/groups/controllers/GroupController');
const GroupService = require('../modules/groups/services/GroupService');
const GroupRepository = require('../modules/groups/repositories/GroupRepository');
const authMiddleware = require('../shared/middlewares/auth.middleware');

const groupRoutes = express.Router();
const controller = new GroupController(new GroupService(new GroupRepository()));

groupRoutes.get('/', authMiddleware, (req, res, next) => controller.getAll(req, res, next));
groupRoutes.post('/', authMiddleware, (req, res, next) => controller.create(req, res, next));
groupRoutes.get('/:id', authMiddleware, (req, res, next) => controller.getById(req, res, next));
groupRoutes.put('/:id', authMiddleware, (req, res, next) => controller.update(req, res, next));
groupRoutes.delete('/:id', authMiddleware, (req, res, next) => controller.remove(req, res, next));
groupRoutes.post('/:id/join', authMiddleware, (req, res, next) => controller.join(req, res, next));
groupRoutes.post('/:id/leave', authMiddleware, (req, res, next) => controller.leave(req, res, next));

module.exports = groupRoutes;
