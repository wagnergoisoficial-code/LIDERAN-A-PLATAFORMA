const { ValidationError } = require('../../../shared/errors/AppError');
const ValidationUtil = require('../../../shared/utils/validation.util');
const { normalizeBackground } = require('../../../shared/utils/background.util');

const MAX_LENGTH = 5000;
const TYPES = ['post', 'donation'];
// Do formulário com imagem os números chegam como texto
const toNumber = (value) => (value === undefined || value === null || value === '' ? null : Number(value));

// Uma publicação precisa de texto, imagem ou ambos. Uma doação precisa também do local para buscar.
class CreatePostDto {
  constructor(data = {}) {
    this.content = typeof data.content === 'string' ? data.content.trim() : '';
    this.imageUrl = data.imageUrl || null;
    this.userId = data.userId;
    this.churchId = data.churchId;
    this.type = data.type || 'post';
    this.location = typeof data.location === 'string' ? data.location.trim() : '';
    this.latitude = toNumber(data.latitude);
    this.longitude = toNumber(data.longitude);
    this.background = data.background;
  }

  get isDonation() {
    return this.type === 'donation';
  }

  validate() {
    if (!this.content && !this.imageUrl) {
      throw new ValidationError('Escreva algo ou selecione uma imagem');
    }

    if (this.content.length > MAX_LENGTH) {
      throw new ValidationError(`A publicação pode ter no máximo ${MAX_LENGTH} caracteres`);
    }

    if (ValidationUtil.isEmpty(this.userId)) {
      throw new ValidationError('Usuário não identificado');
    }

    if (!TYPES.includes(this.type)) {
      throw new ValidationError('Tipo de publicação inválido');
    }

    // A cor só vale para texto sem imagem; doações mostram o local, sem cor
    this.background = this.imageUrl || this.type === 'donation' ? null : normalizeBackground(this.background);

    if (this.isDonation) {
      if (this.location.length < 3 || this.location.length > 200) {
        throw new ValidationError('Indique onde buscar a doação (bairro, cidade ou ponto de referência)');
      }
      const hasPoint = this.latitude !== null || this.longitude !== null;
      const valid = Number.isFinite(this.latitude) && Number.isFinite(this.longitude)
        && Math.abs(this.latitude) <= 90 && Math.abs(this.longitude) <= 180;
      if (hasPoint && !valid) throw new ValidationError('Localização inválida');
    }

    return true;
  }
}

module.exports = CreatePostDto;
