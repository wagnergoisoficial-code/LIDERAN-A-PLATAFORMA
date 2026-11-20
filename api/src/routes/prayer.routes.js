const express = require('express');
const PrayerController = require('../modules/prayers/controllers/PrayerController');
const PrayerService = require('../modules/prayers/services/PrayerService');
const PrayerRepository = require('../modules/prayers/repositories/PrayerRepository');
const authMiddleware = require('../shared/middlewares/auth.middleware');

const prayerRoutes = express.Router();

const prayerRepository = new PrayerRepository();
const prayerService = new PrayerService(prayerRepository);
const prayerController = new PrayerController(prayerService);

prayerRoutes.get('/', authMiddleware, (req, res, next) => prayerController.getAll(req, res, next));
prayerRoutes.post('/', authMiddleware, (req, res, next) => prayerController.create(req, res, next));
prayerRoutes.post('/:id/pray', authMiddleware, (req, res, next) => prayerController.pray(req, res, next));
prayerRoutes.delete('/:id/pray', authMiddleware, (req, res, next) => prayerController.unpray(req, res, next));
prayerRoutes.patch('/:id/answered', authMiddleware, (req, res, next) => prayerController.markAnswered(req, res, next));
prayerRoutes.delete('/:id', authMiddleware, (req, res, next) => prayerController.remove(req, res, next));

module.exports = prayerRoutes;
