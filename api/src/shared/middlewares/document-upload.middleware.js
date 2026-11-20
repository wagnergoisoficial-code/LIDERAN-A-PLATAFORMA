const multer = require('multer');
const config = require('../../config/environment');
const { SIGNATURES, processImage } = require('./upload.middleware');

// Documentos em PDF ou imagem, um por campo (ex.: "identity" e "leadership" na verificação de líder).
// Imagens são reprocessadas (sem metadados, legíveis até 2400 px); PDF fica como veio.
const DOCUMENT_DIMENSION = 2400;
const isPdf = (buffer) => buffer.length > 4 && buffer.subarray(0, 5).toString('ascii') === '%PDF-';

const reject = (res, message) => res.status(400).json({ success: false, message, statusCode: 400 });

// Expõe req.documents: [{ kind, mimeType, data }], com kind = nome do campo
// fieldSize: tamanho máximo de cada campo de texto (o texto de uma ata precisa de mais)
const documentUpload = (FIELDS, { fieldSize = 10 * 1024 } = {}) => {
  const upload = multer({
    storage: multer.memoryStorage(),
    limits: { fileSize: config.file.maxFileSize, files: FIELDS.length, fields: 20, fieldSize },
  });
  return (req, res, next) => upload.fields(FIELDS.map((name) => ({ name, maxCount: 1 })))(req, res, async (err) => {
    if (err instanceof multer.MulterError) {
      return reject(res, err.code === 'LIMIT_FILE_SIZE'
        ? `Cada documento pode ter no máximo ${Math.round(config.file.maxFileSize / 1024 / 1024)} MB`
        : 'Envio de documentos inválido');
    }
    if (err) return next(err);

    req.documents = [];
    for (const kind of FIELDS) {
      const file = req.files?.[kind]?.[0];
      if (!file) continue;
      if (isPdf(file.buffer)) {
        req.documents.push({ kind, mimeType: 'application/pdf', data: file.buffer });
        continue;
      }
      if (!SIGNATURES.some((signature) => signature.test(file.buffer))) {
        return reject(res, 'Envie os documentos em PDF, JPEG, PNG ou WebP');
      }
      try {
        const processed = await processImage(file.buffer, DOCUMENT_DIMENSION);
        req.documents.push({ kind, mimeType: 'image/webp', data: processed.data });
      } catch {
        return reject(res, 'Não foi possível ler um dos documentos');
      }
    }
    next();
  });
};

const documentUploadMiddleware = documentUpload(['identity', 'leadership']);

module.exports = { documentUpload, documentUploadMiddleware };
