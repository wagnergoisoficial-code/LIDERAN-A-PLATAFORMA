const { ValidationError } = require('../../../shared/errors/AppError');
const ValidationUtil = require('../../../shared/utils/validation.util');

const PASSWORD_RULE_MESSAGE = 'A senha deve ter pelo menos 8 caracteres, com letra maiúscula, minúscula e número';

// Register DTO with validation
// O registo público cria sempre uma conta de líder: o cargo enviado pelo cliente é ignorado.
class RegisterDto {
  constructor(data = {}) {
    this.name = typeof data.name === 'string' ? data.name.trim() : data.name;
    this.email = typeof data.email === 'string' ? data.email.trim() : data.email;
    this.password = data.password;
    this.confirmPassword = data.confirmPassword;
    this.role = 'leader';
  }

  validate() {
    if (ValidationUtil.isEmpty(this.name)) {
      throw new ValidationError('Informe o nome');
    }

    if (this.name.length < 2) {
      throw new ValidationError('O nome deve ter pelo menos 2 caracteres');
    }

    if (ValidationUtil.isEmpty(this.email)) {
      throw new ValidationError('Informe o e-mail');
    }

    if (!ValidationUtil.validateEmail(this.email)) {
      throw new ValidationError('E-mail inválido');
    }

    if (ValidationUtil.isEmpty(this.password)) {
      throw new ValidationError('Informe a senha');
    }

    if (!ValidationUtil.validatePassword(this.password)) {
      throw new ValidationError(PASSWORD_RULE_MESSAGE);
    }

    if (this.password !== this.confirmPassword) {
      throw new ValidationError('As senhas não conferem');
    }

    return true;
  }
}

RegisterDto.PASSWORD_RULE_MESSAGE = PASSWORD_RULE_MESSAGE;

module.exports = RegisterDto;
