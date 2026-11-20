const express = require('express');
const path = require('path');
const { getPrismaClient } = require('../config/database');
const config = require('../config/environment');

// Cabeçalhos que impedem que um ficheiro seja interpretado como página (HTML/scripts)
const SAFE_HEADERS = {
  'X-Content-Type-Options': 'nosniff',
  'Content-Security-Policy': "default-src 'none'; img-src 'self'; style-src 'unsafe-inline'; sandbox",
  'Cross-Origin-Resource-Policy': 'cross-origin',
};

const uploadRoutes = express.Router();

// Imagens guardadas na base de dados (IDs no formato cuid)
uploadRoutes.get('/:id', async (req, res, next) => {
  if (!/^c[a-z0-9]{20,30}$/.test(req.params.id)) return next();
  try {
    const file = await getPrismaClient().upload.findUnique({
      where: { id: req.params.id },
      select: { mimeType: true, size: true, data: true },
    });
    if (!file) return next();

    res.set({
      ...SAFE_HEADERS,
      'Content-Type': file.mimeType,
      'Content-Length': file.size,
      // O conteúdo de um ID nunca muda
      'Cache-Control': 'public, max-age=31536000, immutable',
    });
    res.end(Buffer.from(file.data));
  } catch (error) {
    next(error);
  }
});

// Ficheiros antigos gravados em disco (só existem em instalações locais)
uploadRoutes.use(
  express.static(path.resolve(config.file.uploadDir), {
    dotfiles: 'deny',
    index: false,
    setHeaders: (res) => res.set(SAFE_HEADERS),
  })
);

module.exports = uploadRoutes;
