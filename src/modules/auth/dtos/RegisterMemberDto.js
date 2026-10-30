const ValidationUtil = require('../../../shared/utils/validation.util');
const { ValidationError } = require('../../../shared/errors/AppError');
const { PASSWORD_RULE_MESSAGE } = require('./RegisterDto');

class RegisterMemberDto {
  constructor(data = {}) {
    this.name = typeof data.name === 'string' ? data.name.trim() : data.name;
    this.email = typeof data.email === 'string' ? data.email.trim() : data.email;
    this.password = data.password;
    this.confirmPassword = data.confirmPassword;
    this.churchId = data.churchId;
    this.age = data.age ? parseInt(data.age, 10) : null;
    this.title = data.title || null;
    this.location = data.location || null;
  }

  validate() {
    if (ValidationUtil.isEmpty(this.name) || this.name.length < 2) {
      throw new ValidationError('Informe o nome do membro (mínimo 2 caracteres)');
    }

    if (ValidationUtil.isEmpty(this.email) || !ValidationUtil.isValidEmail(this.email)) {
      throw new ValidationError('Informe um e-mail válido');
    }

    if (ValidationUtil.isEmpty(this.password) || !ValidationUtil.validatePassword(this.password)) {
      throw new ValidationError(PASSWORD_RULE_MESSAGE);
    }

    if (this.password !== this.confirmPassword) {
      throw new ValidationError('As senhas não conferem');
    }

    if (this.age !== null && (Number.isNaN(this.age) || this.age < 1 || this.age > 150)) {
      throw new ValidationError('Idade deve ser entre 1 e 150');
    }

    if (ValidationUtil.isEmpty(this.churchId)) {
      throw new ValidationError('Selecione a comunidade do membro');
    }

    return true;
  }
}

module.exports = RegisterMemberDto;
