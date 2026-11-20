const express = require('express');
const NotificationController = require('../modules/notifications/controllers/NotificationController');
const NotificationService = require('../modules/notifications/services/NotificationService');
const NotificationRepository = require('../modules/notifications/repositories/NotificationRepository');
const authMiddleware = require('../shared/middlewares/auth.middleware');

const notificationRoutes = express.Router();

const notificationRepository = new NotificationRepository();
const notificationService = new NotificationService(notificationRepository);
const notificationController = new NotificationController(notificationService);

notificationRoutes.get('/', authMiddleware, (req, res, next) => notificationController.getAll(req, res, next));
notificationRoutes.patch('/:id/read', authMiddleware, (req, res, next) => notificationController.markRead(req, res, next));
notificationRoutes.patch('/read-all', authMiddleware, (req, res, next) => notificationController.markAllRead(req, res, next));

module.exports = notificationRoutes;
