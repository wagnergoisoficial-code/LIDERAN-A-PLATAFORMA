const express = require('express');
const reportService = require('../modules/reports/report.service');
const authMiddleware = require('../shared/middlewares/auth.middleware');
const roleMiddleware = require('../shared/middlewares/role.middleware');

// Denúncias: qualquer membro denuncia; os líderes da comunidade analisam
const router = express.Router();
const handle = (fn) => async (req, res, next) => {
  try {
    await fn(req, res);
  } catch (error) {
    next(error);
  }
};

router.use(authMiddleware);

router.post('/', handle(async (req, res) => {
  const result = await reportService.create(req.user, req.body);
  res.status(result.duplicate ? 200 : 201).json({
    success: true,
    message: 'Denúncia enviada ao líder da comunidade',
    data: result,
  });
}));

router.get('/', roleMiddleware('leader', 'admin'), handle(async (req, res) => {
  res.json({ success: true, data: await reportService.list(req.user, { churchId: req.query.churchId, status: req.query.status }) });
}));

router.get('/count', roleMiddleware('leader', 'admin'), handle(async (req, res) => {
  res.json({ success: true, data: { open: await reportService.countOpen(req.user, req.query.churchId) } });
}));

router.get('/:id', roleMiddleware('leader', 'admin'), handle(async (req, res) => {
  res.json({ success: true, data: await reportService.get(req.user, req.params.id) });
}));

router.patch('/:id', roleMiddleware('leader', 'admin'), handle(async (req, res) => {
  res.json({ success: true, message: 'Denúncia atualizada', data: await reportService.update(req.user, req.params.id, req.body) });
}));

module.exports = router;
