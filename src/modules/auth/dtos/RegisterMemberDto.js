const ValidationUtil = require('../../../shared/utils/validation.util');
const { ValidationError } = require('../../../shared/errors/AppError');
const { ageFrom } = require('../../../shared/utils/minor.util');
const { PASSWORD_RULE_MESSAGE } = require('./RegisterDto');

class RegisterMemberDto {
  constructor(data = {}) {
    this.name = typeof data.name === 'string' ? data.name.trim() : data.name;
    this.email = typeof data.email === 'string' ? data.email.trim() : data.email;
    this.password = data.password;
    this.confirmPassword = data.confirmPassword;
    this.churchId = data.churchId;
    this.birthDate = data.birthDate ? new Date(data.birthDate) : null;
    this.title = data.title || null;
    this.location = data.location || null;
    // Obrigatório quando o membro é menor de idade
    this.guardian = data.guardian && typeof data.guardian === 'object' ? data.guardian : null;
  }

  get age() {
    return this.birthDate ? ageFrom(this.birthDate) : null;
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

    if (!this.birthDate || Number.isNaN(this.birthDate.getTime())) {
      throw new ValidationError('Informe a data de nascimento do membro');
    }

    if (this.birthDate > new Date() || this.age > 120) {
      throw new ValidationError('Data de nascimento inválida');
    }

    if (this.age < 18 && !this.guardian) {
      throw new ValidationError('Membros menores de 18 anos precisam de um responsável (pai, mãe ou tutor)');
    }

    if (ValidationUtil.isEmpty(this.churchId)) {
      throw new ValidationError('Selecione a comunidade do membro');
    }

    if (this.guardian && String(this.guardian.email || '').trim().toLowerCase() === String(this.email).toLowerCase()) {
      throw new ValidationError('O e-mail do responsável tem de ser diferente do e-mail do membro');
    }

    return true;
  }
}

module.exports = RegisterMemberDto;
