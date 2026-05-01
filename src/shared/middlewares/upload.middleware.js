const multer = require('multer');
const path = require('path');
const fs = require('fs');
const config = require('../../config/environment');

// Create uploads directory if it doesn't exist
const uploadDir = config.file.uploadDir;
if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir, { recursive: true });
}

// Configure storage
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, uploadDir);
  },
  filename: (req, file, cb) => {
    // Generate unique filename: timestamp_originalname
    const uniqueSuffix = Date.now() + '_' + Math.round(Math.random() * 1e9);
    const ext = path.extname(file.originalname);
    const name = path.basename(file.originalname, ext);
    cb(null, name + '_' + uniqueSuffix + ext);
  }
});

// Filter only image files
const fileFilter = (req, file, cb) => {
  const allowedMimes = ['image/jpeg', 'image/png', 'image/gif', 'image/webp'];
  
  if (allowedMimes.includes(file.mimetype)) {
    cb(null, true);
  } else {
    cb(new Error('Apenas imagens (JPEG, PNG, GIF, WebP) são permitidas'), false);
  }
};

// Configure multer
const upload = multer({
  storage,
  fileFilter,
  limits: {
    fileSize: config.file.maxFileSize // 5MB by default
  }
});

// Middleware para single image upload
const uploadSingleImage = upload.single('image');

// Middleware wrapper that generates image URL
const uploadImageMiddleware = (req, res, next) => {
  uploadSingleImage(req, res, (err) => {
    if (err instanceof multer.MulterError) {
      return res.status(400).json({
        success: false,
        message: `Erro no upload: ${err.message}`,
        statusCode: 400
      });
    } else if (err) {
      return res.status(400).json({
        success: false,
        message: err.message,
        statusCode: 400
      });
    }

    // Add full image URL to request body if file was uploaded
    if (req.file) {
      const baseUrl = `http://${req.get('host')}`;
      req.body.imageUrl = `${baseUrl}/uploads/${req.file.filename}`;
    }

    next();
  });
};

module.exports = {
  uploadImageMiddleware,
  upload
};
