const express = require('express');
const service = require('../modules/leader-verification/leader-verification.service');
const authMiddleware = require('../shared/middlewares/auth.middleware');
const roleMiddleware = require('../shared/middlewares/role.middleware');
const { documentUploadMiddleware } = require('../shared/middlewares/document-upload.middleware');

// Verificação de líderes: o líder pede, o administrador da plataforma decide
const router = express.Router();
const handle = (fn) => async (req, res, next) => {
  try {
    await fn(req, res);
  } catch (error) {
    next(error);
  }
};

router.use(authMiddleware);

router.get('/me', handle(async (req, res) => {
  res.json({ success: true, data: await service.mine(req.user) });
}));

router.post('/', roleMiddleware('leader'), documentUploadMiddleware, handle(async (req, res) => {
  const verification = await service.submit(req.user, req.body, req.documents);
  res.status(201).json({ success: true, message: 'Pedido de verificação enviado', data: verification });
}));

router.get('/documents/:id', handle(async (req, res) => {
  const document = await service.document(req.user, req.params.id);
  res.set({
    'Content-Type': document.mimeType,
    'Cache-Control': 'private, no-store',
    'X-Content-Type-Options': 'nosniff',
  });
  res.send(Buffer.from(document.data));
}));

router.get('/', roleMiddleware('admin'), handle(async (req, res) => {
  res.json({ success: true, data: await service.list(req.query.status) });
}));

router.patch('/:id', roleMiddleware('admin'), handle(async (req, res) => {
  const verification = await service.review(req.user, req.params.id, req.body);
  res.json({ success: true, message: verification.status === 'approved' ? 'Líder verificado' : 'Pedido recusado', data: verification });
}));

module.exports = router;
