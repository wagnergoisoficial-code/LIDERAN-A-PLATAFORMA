const express = require('express');
const PollController = require('../modules/polls/controllers/PollController');
const PollService = require('../modules/polls/services/PollService');
const PollRepository = require('../modules/polls/repositories/PollRepository');
const authMiddleware = require('../shared/middlewares/auth.middleware');

const pollRoutes = express.Router();

const pollRepository = new PollRepository();
const pollService = new PollService(pollRepository);
const pollController = new PollController(pollService);

pollRoutes.get('/', authMiddleware, (req, res, next) => pollController.getAll(req, res, next));
pollRoutes.post('/', authMiddleware, (req, res, next) => pollController.create(req, res, next));
pollRoutes.post('/:id/vote', authMiddleware, (req, res, next) => pollController.vote(req, res, next));
pollRoutes.delete('/:id', authMiddleware, (req, res, next) => pollController.remove(req, res, next));

module.exports = pollRoutes;
