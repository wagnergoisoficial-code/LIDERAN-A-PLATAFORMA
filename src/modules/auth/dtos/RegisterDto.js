const { ValidationError } = require('../../../shared/errors/AppError');
const ValidationUtil = require('../../../shared/utils/validation.util');

// Register DTO with validation - LEADERS SIGN UP WITHOUT A CHURCH
class RegisterDto {
  constructor(data) {
    this.name = data.name;
    this.email = data.email;
    this.password = data.password;
    this.confirmPassword = data.confirmPassword;
    this.role = data.role || 'leader';
    // Leaders don't need a churchId - they'll create one after signing up
  }

  validate() {
    if (ValidationUtil.isEmpty(this.name)) {
      throw new ValidationError('Name is required');
    }

    if (this.name.trim().length < 2) {
      throw new ValidationError('Name must be at least 2 characters');
    }

    if (ValidationUtil.isEmpty(this.email)) {
      throw new ValidationError('Email is required');
    }

    if (!ValidationUtil.validateEmail(this.email)) {
      throw new ValidationError('Invalid email format');
    }

    if (ValidationUtil.isEmpty(this.password)) {
      throw new ValidationError('Password is required');
    }

    if (!ValidationUtil.validatePassword(this.password)) {
      throw new ValidationError(
        'Password must be at least 8 characters with uppercase, lowercase, and digit'
      );
    }

    if (this.password !== this.confirmPassword) {
      throw new ValidationError('Password and Confirm Password must match');
    }

    return true;
  }
}

module.exports = RegisterDto;
