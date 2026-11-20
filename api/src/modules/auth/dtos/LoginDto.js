const { ValidationError } = require('../../../shared/errors/AppError');
const ValidationUtil = require('../../../shared/utils/validation.util');

// Login DTO with validation
class LoginDto {
  constructor(data = {}) {
    this.email = typeof data.email === 'string' ? data.email.trim() : data.email;
    this.password = data.password;
  }

  validate() {
    if (ValidationUtil.isEmpty(this.email)) {
      throw new ValidationError('Informe o e-mail');
    }

    if (!ValidationUtil.validateEmail(this.email)) {
      throw new ValidationError('E-mail inválido');
    }

    if (ValidationUtil.isEmpty(this.password)) {
      throw new ValidationError('Informe a senha');
    }

    return true;
  }
}

module.exports = LoginDto;
