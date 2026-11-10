const express = require('express');
const service = require('../modules/panels/panel.service');
const authMiddleware = require('../shared/middlewares/auth.middleware');
const { documentUpload } = require('../shared/middlewares/document-upload.middleware');

// Painéis por cargo (liderança, secretaria, tesouraria, regência), sempre na comunidade ativa
const router = express.Router();
const handle = (fn) => async (req, res, next) => {
  try {
    await fn(req, res);
  } catch (error) {
    next(error);
  }
};
// Confirma o cargo antes de receber o arquivo
const onlySecretary = (req, res, next) => service.panelChurch(req.user, 'secretario').then(() => next(), next);

router.use(authMiddleware);

router.put('/cargos/:memberId', handle(async (req, res) => {
  const member = await service.setCargo(req.user, req.params.memberId, req.body.cargo);
  res.json({ success: true, message: member.cargo ? 'Cargo atribuído' : 'Cargo retirado', data: member });
}));

router.get('/finance', handle(async (req, res) => {
  res.json({ success: true, data: await service.listFinance(req.user, req.query) });
}));
router.post('/finance', handle(async (req, res) => {
  res.status(201).json({ success: true, message: 'Lançamento registrado', data: await service.createFinance(req.user, req.body) });
}));
router.delete('/finance/:id', handle(async (req, res) => {
  await service.removeFinance(req.user, req.params.id);
  res.json({ success: true, message: 'Lançamento apagado' });
}));

router.get('/documents', handle(async (req, res) => {
  res.json({ success: true, data: await service.listDocuments(req.user) });
}));
router.post('/documents', onlySecretary, documentUpload(['file']), handle(async (req, res) => {
  const document = await service.createDocument(req.user, req.body, req.documents[0]);
  res.status(201).json({ success: true, message: 'Documento guardado', data: document });
}));
router.get('/documents/:id/file', handle(async (req, res) => {
  const document = await service.documentFile(req.user, req.params.id);
  res.set({
    'Content-Type': document.mimeType,
    'Cache-Control': 'private, no-store',
    'X-Content-Type-Options': 'nosniff',
  });
  res.send(Buffer.from(document.data));
}));
router.delete('/documents/:id', handle(async (req, res) => {
  await service.removeDocument(req.user, req.params.id);
  res.json({ success: true, message: 'Documento apagado' });
}));

router.get('/songs', handle(async (req, res) => {
  res.json({ success: true, data: await service.listSongs(req.user) });
}));
router.post('/songs', handle(async (req, res) => {
  res.status(201).json({ success: true, message: 'Música adicionada', data: await service.createSong(req.user, req.body) });
}));
router.put('/songs/:id', handle(async (req, res) => {
  res.json({ success: true, message: 'Música atualizada', data: await service.updateSong(req.user, req.params.id, req.body) });
}));
router.delete('/songs/:id', handle(async (req, res) => {
  await service.removeSong(req.user, req.params.id);
  res.json({ success: true, message: 'Música apagada' });
}));

module.exports = router;
