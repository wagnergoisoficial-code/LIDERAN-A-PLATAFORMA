const express = require('express');
const guardianService = require('../modules/guardians/guardian.service');
const authMiddleware = require('../shared/middlewares/auth.middleware');
const roleMiddleware = require('../shared/middlewares/role.middleware');

// Área do responsável: vê (sem escrever) as conversas privadas dos filhos menores
const router = express.Router();
const handle = (fn) => async (req, res, next) => {
  try {
    await fn(req, res);
  } catch (error) {
    next(error);
  }
};

router.use(authMiddleware, roleMiddleware('guardian'));

router.get('/children', handle(async (req, res) => {
  res.json({ success: true, data: await guardianService.children(req.user) });
}));

router.get('/children/:minorId/conversations/:conversationId', handle(async (req, res) => {
  res.json({
    success: true,
    data: await guardianService.childConversation(req.user, req.params.minorId, req.params.conversationId),
  });
}));

// O responsável autoriza o cadastro do filho
router.post('/children/:minorId/authorize', handle(async (req, res) => {
  const minor = await guardianService.approveByGuardian(req.user, req.params.minorId);
  res.json({ success: true, message: `Cadastro de ${minor.name} autorizado`, data: { id: minor.id, status: minor.status } });
}));

module.exports = router;
