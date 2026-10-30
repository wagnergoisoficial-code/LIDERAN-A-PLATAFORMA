const ValidationUtil = require('../../../shared/utils/validation.util');
const { ValidationError } = require('../../../shared/errors/AppError');

const VALID_DAYS = ['domingo', 'segunda', 'terça', 'quarta', 'quinta', 'sexta', 'sábado'];

class CreateChurchDto {
  constructor(data = {}) {
    this.name = typeof data.name === 'string' ? data.name.trim() : data.name;
    this.title = data.title || null;
    this.description = data.description || null;
    this.imageUrl = data.imageUrl || null;
    this.cultosDias = Array.isArray(data.cultosDias) ? data.cultosDias : null; // ["segunda", "quarta", "domingo"]
  }

  validate() {
    if (ValidationUtil.isEmpty(this.name)) {
      throw new ValidationError('Informe o nome da comunidade');
    }

    if (this.name.length < 2) {
      throw new ValidationError('O nome da comunidade deve ter pelo menos 2 caracteres');
    }

    if (this.cultosDias && this.cultosDias.some((dia) => !VALID_DAYS.includes(dia))) {
      throw new ValidationError('Dia de culto inválido');
    }

    return true;
  }
}

CreateChurchDto.VALID_DAYS = VALID_DAYS;

module.exports = CreateChurchDto;
