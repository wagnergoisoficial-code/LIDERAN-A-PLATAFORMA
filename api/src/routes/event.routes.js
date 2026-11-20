const express = require('express');
const EventController = require('../modules/events/controllers/EventController');
const EventService = require('../modules/events/services/EventService');
const EventRepository = require('../modules/events/repositories/EventRepository');
const authMiddleware = require('../shared/middlewares/auth.middleware');

const eventRoutes = express.Router();

const eventRepository = new EventRepository();
const eventService = new EventService(eventRepository);
const eventController = new EventController(eventService);

eventRoutes.get('/', authMiddleware, (req, res, next) => eventController.getAll(req, res, next));
eventRoutes.post('/', authMiddleware, (req, res, next) => eventController.create(req, res, next));
eventRoutes.get('/:id', authMiddleware, (req, res, next) => eventController.getById(req, res, next));
eventRoutes.put('/:id', authMiddleware, (req, res, next) => eventController.update(req, res, next));
eventRoutes.delete('/:id', authMiddleware, (req, res, next) => eventController.remove(req, res, next));
eventRoutes.post('/:id/rsvp', authMiddleware, (req, res, next) => eventController.rsvp(req, res, next));

module.exports = eventRoutes;
