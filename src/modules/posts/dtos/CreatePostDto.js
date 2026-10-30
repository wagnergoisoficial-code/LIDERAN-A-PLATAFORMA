const { ValidationError } = require('../../../shared/errors/AppError');
const ValidationUtil = require('../../../shared/utils/validation.util');

const MAX_LENGTH = 5000;

// Uma publicação precisa de texto, imagem ou ambos
class CreatePostDto {
  constructor(data = {}) {
    this.content = typeof data.content === 'string' ? data.content.trim() : '';
    this.imageUrl = data.imageUrl || null;
    this.userId = data.userId;
    this.churchId = data.churchId;
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

    return true;
  }
}

module.exports = CreatePostDto;
