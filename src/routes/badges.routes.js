const express = require('express');
const { badges } = require('../modules/badges/badges.service');
const authMiddleware = require('../shared/middlewares/auth.middleware');

// Números dos ícones (Mensagens e Feed): GET /api/badges?chatSince=<data>&feedSince=<data>
const router = express.Router();

router.get('/', authMiddleware, async (req, res, next) => {
  try {
    res.json({ success: true, data: await badges(req.user, req.query) });
  } catch (error) {
    next(error);
  }
});

module.exports = router;
