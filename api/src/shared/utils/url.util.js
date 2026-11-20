// Imagens só podem apontar para ficheiros enviados à própria API (/uploads/<id>)
const UPLOAD_URL = /^(https?:\/\/[^\s/?#]+)?\/uploads\/[\w.-]+$/;

const isUploadUrl = (value) => typeof value === 'string' && UPLOAD_URL.test(value);

module.exports = { isUploadUrl };
