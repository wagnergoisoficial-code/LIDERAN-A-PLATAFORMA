const multer = require('multer');
const sharp = require('sharp');
const config = require('../../config/environment');
const { getPrismaClient } = require('../../config/database');

// O tipo declarado pelo navegador não é confiável: valida-se a assinatura real do ficheiro
const SIGNATURES = [
  { mime: 'image/jpeg', test: (b) => b.length > 3 && b[0] === 0xff && b[1] === 0xd8 && b[2] === 0xff },
  { mime: 'image/png', test: (b) => b.length > 8 && b.subarray(0, 8).equals(Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a])) },
  { mime: 'image/gif', test: (b) => ['GIF87a', 'GIF89a'].includes(b.subarray(0, 6).toString('ascii')) },
  { mime: 'image/webp', test: (b) => b.subarray(0, 4).toString('ascii') === 'RIFF' && b.subarray(8, 12).toString('ascii') === 'WEBP' },
];

const MAX_DIMENSION = 1600;
// Proteção contra "bombas de descompressão" (imagens pequenas que expandem para gigapixels)
const MAX_INPUT_PIXELS = 100_000_000;

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: config.file.maxFileSize, files: 1, fields: 20, fieldSize: 100 * 1024 },
});

const reject = (res, message) => res.status(400).json({ success: false, message, statusCode: 400 });

const publicBaseUrl = (req) => config.app.publicUrl || `${req.protocol}://${req.get('host')}`;

// Reprocessa a imagem: corrige a orientação, limita o tamanho, converte para WebP e
// descarta metadados (incluindo localização GPS). Ficheiros disfarçados falham aqui.
async function processImage(buffer) {
  return sharp(buffer, { animated: true, limitInputPixels: MAX_INPUT_PIXELS })
    .rotate()
    .resize({ width: MAX_DIMENSION, height: MAX_DIMENSION, fit: 'inside', withoutEnlargement: true })
    .webp({ quality: 80 })
    .toBuffer({ resolveWithObject: true });
}

// Middleware para uma imagem no campo "image". Quando há imagem, guarda-a na base de dados
// e expõe o endereço público em req.uploadedImageUrl.
const uploadImageMiddleware = (req, res, next) => {
  upload.single('image')(req, res, async (err) => {
    if (err instanceof multer.MulterError) {
      if (err.code === 'LIMIT_FILE_SIZE') {
        return reject(res, `A imagem pode ter no máximo ${Math.round(config.file.maxFileSize / 1024 / 1024)} MB`);
      }
      return reject(res, 'Envio de imagem inválido');
    }
    if (err) return next(err);
    if (!req.file) return next();

    if (!SIGNATURES.some((signature) => signature.test(req.file.buffer))) {
      return reject(res, 'Envie uma imagem JPEG, PNG, GIF ou WebP');
    }

    let processed;
    try {
      processed = await processImage(req.file.buffer);
    } catch {
      return reject(res, 'Não foi possível processar a imagem');
    }

    try {
      const saved = await getPrismaClient().upload.create({
        data: {
          mimeType: 'image/webp',
          size: processed.data.length,
          width: processed.info.width,
          height: processed.info.pageHeight || processed.info.height,
          data: processed.data,
          userId: req.user?.id || null,
        },
        select: { id: true },
      });
      req.uploadedImageUrl = `${publicBaseUrl(req)}/uploads/${saved.id}`;
      next();
    } catch (error) {
      next(error);
    }
  });
};

module.exports = {
  uploadImageMiddleware,
  upload,
};
