const { ValidationError } = require('../../../shared/errors/AppError');
const ValidationUtil = require('../../../shared/utils/validation.util');

// Login DTO with validation
class LoginDto {
  constructor(data) {
    this.email = data.email;
    this.password = data.password;
  }

  validate() {
    if (ValidationUtil.isEmpty(this.email)) {
      throw new ValidationError('Email is required');
    }

    if (!ValidationUtil.validateEmail(this.email)) {
      throw new ValidationError('Invalid email format');
    }

    if (ValidationUtil.isEmpty(this.password)) {
      throw new ValidationError('Password is required');
    }

    return true;
  }
}

module.exports = LoginDto;
