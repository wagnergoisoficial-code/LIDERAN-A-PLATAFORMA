const express = require('express');
const AuthService = require('../modules/auth/services/AuthService');
const UserRepository = require('../modules/auth/repositories/UserRepository');
const { registerLimiter } = require('../shared/middlewares/rate-limit.middleware');

// Link de convite de uma comunidade: público, para os fiéis se registarem nela
const router = express.Router();
const authService = new AuthService(new UserRepository());

router.get('/:code', async (req, res, next) => {
  try {
    res.json({ success: true, data: await authService.inviteInfo(req.params.code) });
  } catch (error) {
    next(error);
  }
});

router.post('/:code/register', registerLimiter, async (req, res, next) => {
  try {
    const result = await authService.registerByInvite(req.params.code, req.body);
    res.status(201).json({ success: true, message: 'Conta criada: bem-vindo à comunidade', data: result });
  } catch (error) {
    next(error);
  }
});

module.exports = router;
