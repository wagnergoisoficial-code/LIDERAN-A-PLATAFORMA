const express = require('express');
const service = require('../modules/videos/video.service');
const authMiddleware = require('../shared/middlewares/auth.middleware');

// Vídeos (links do YouTube): enviar, aprovar e ver os de todas as comunidades
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
  res.json({ success: true, data: await service.list(req.user) });
}));

router.post('/', handle(async (req, res) => {
  const video = await service.create(req.user, req.body);
  res.status(201).json({
    success: true,
    message: video.status === 'approved' ? 'Vídeo publicado para todas as comunidades' : 'Vídeo enviado: aparece depois de o líder aprovar',
    data: video,
  });
}));

router.patch('/:id', handle(async (req, res) => {
  const video = await service.review(req.user, req.params.id, req.body);
  res.json({ success: true, message: video.status === 'approved' ? 'Vídeo aprovado' : 'Vídeo recusado', data: video });
}));

router.delete('/:id', handle(async (req, res) => {
  await service.remove(req.user, req.params.id);
  res.json({ success: true, message: 'Vídeo apagado' });
}));

module.exports = router;
