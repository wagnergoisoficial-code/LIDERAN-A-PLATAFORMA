const { ValidationError } = require('../../../shared/errors/AppError');

const MAX_LENGTH = 1000;

class CreateCommentDto {
  constructor(data = {}) {
    this.content = typeof data.content === 'string' ? data.content.trim() : '';
    this.postId = data.postId;
    this.userId = data.userId;
  }

  validate() {
    if (!this.content) {
      throw new ValidationError('Escreva um comentário');
    }

    if (this.content.length > MAX_LENGTH) {
      throw new ValidationError(`O comentário pode ter no máximo ${MAX_LENGTH} caracteres`);
    }

    return true;
  }
}

module.exports = CreateCommentDto;
