const { ValidationError } = require('../../../shared/errors/AppError');

class CreateDevotionalDto {
  constructor(data = {}) {
    this.title = typeof data.title === 'string' ? data.title.trim() : '';
    this.content = typeof data.content === 'string' ? data.content.trim() : '';
    this.verse = typeof data.verse === 'string' && data.verse.trim() ? data.verse.trim() : null;
  }

  validate() {
    if (this.title.length < 3) {
      throw new ValidationError('O título deve ter pelo menos 3 caracteres');
    }

    if (this.content.length < 10) {
      throw new ValidationError('A reflexão deve ter pelo menos 10 caracteres');
    }

    return true;
  }
}

module.exports = CreateDevotionalDto;
