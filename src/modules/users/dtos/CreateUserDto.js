const { ValidationError } = require('../../../shared/errors/AppError');
const ValidationUtil = require('../../../shared/utils/validation.util');

// Create User DTO - for leaders/admins creating members
class CreateUserDto {
  constructor(data) {
    this.name = data.name;
    this.email = data.email;
    this.password = data.password;
    this.role = data.role || 'member'; // Default role
    this.churchId = data.churchId;
  }

  validate() {
    if (ValidationUtil.isEmpty(this.name)) {
      throw new ValidationError('Nome é obrigatório');
    }

    if (this.name.trim().length < 2) {
      throw new ValidationError('Nome deve ter pelo menos 2 caracteres');
    }

    if (ValidationUtil.isEmpty(this.email)) {
      throw new ValidationError('Email é obrigatório');
    }

    if (!ValidationUtil.validateEmail(this.email)) {
      throw new ValidationError('Email inválido');
    }

    if (ValidationUtil.isEmpty(this.password)) {
      throw new ValidationError('Senha é obrigatória');
    }

    if (!ValidationUtil.validatePassword(this.password)) {
      throw new ValidationError(
        'Senha deve ter pelo menos 8 caracteres com letras maiúsculas, minúsculas e números'
      );
    }

    if (!['member', 'leader', 'admin'].includes(this.role)) {
      throw new ValidationError('Cargo inválido');
    }

    if (ValidationUtil.isEmpty(this.churchId)) {
      throw new ValidationError('Church ID é obrigatório');
    }

    return true;
  }
}

module.exports = CreateUserDto;
