const express = require('express');
const conversationService = require('../modules/conversations/conversation.service');
const authMiddleware = require('../shared/middlewares/auth.middleware');
const roleMiddleware = require('../shared/middlewares/role.middleware');

// Conversas privadas entre membros da mesma comunidade
const router = express.Router();
const handle = (fn) => async (req, res, next) => {
  try {
    await fn(req, res);
  } catch (error) {
    next(error);
  }
};

router.use(authMiddleware);

router.get('/', handle(async (req, res) => {
  res.json({ success: true, data: await conversationService.list(req.user) });
}));

// Líderes: as conversas privadas da comunidade, só para ler
router.get('/church/:churchId', roleMiddleware('leader', 'admin'), handle(async (req, res) => {
  res.json({ success: true, data: await conversationService.listForChurch(req.user, req.params.churchId) });
}));

router.get('/church/:churchId/:conversationId', roleMiddleware('leader', 'admin'), handle(async (req, res) => {
  res.json({ success: true, data: await conversationService.readForChurch(req.user, req.params.churchId, req.params.conversationId) });
}));

router.get('/unread', handle(async (req, res) => {
  res.json({ success: true, data: { total: await conversationService.unreadTotal(req.user) } });
}));

router.post('/', handle(async (req, res) => {
  res.status(201).json({ success: true, data: await conversationService.start(req.user, req.body.userId) });
}));

router.get('/:id/messages', handle(async (req, res) => {
  res.json({ success: true, data: await conversationService.messages(req.user, req.params.id, { after: req.query.after }) });
}));

router.post('/:id/messages', handle(async (req, res) => {
  res.status(201).json({ success: true, data: await conversationService.send(req.user, req.params.id, req.body.content) });
}));

router.delete('/:id/messages/:messageId', handle(async (req, res) => {
  await conversationService.deleteMessage(req.user, req.params.id, req.params.messageId);
  res.json({ success: true, message: 'Mensagem apagada' });
}));

router.post('/:id/read', handle(async (req, res) => {
  res.json({ success: true, data: await conversationService.markRead(req.user, req.params.id) });
}));

module.exports = router;
