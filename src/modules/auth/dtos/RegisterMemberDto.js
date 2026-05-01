const ValidationUtil = require('../../../shared/utils/validation.util');
const AppError = require('../../../shared/errors/AppError');

class RegisterMemberDto {
  constructor(data = {}) {
    this.name = data.name;
    this.email = data.email;
    this.password = data.password;
    this.confirmPassword = data.confirmPassword;
    this.churchId = data.churchId;
    this.age = data.age;
    this.title = data.title;
    this.location = data.location;
  }

  validate() {
    if (ValidationUtil.isEmpty(this.name)) {
      throw new AppError('Name is required', 400);
    }

    if (ValidationUtil.isEmpty(this.email) || !ValidationUtil.isValidEmail(this.email)) {
      throw new AppError('Valid email is required', 400);
    }

    if (ValidationUtil.isEmpty(this.password)) {
      throw new AppError('Password is required', 400);
    }

    if (this.password.length < 8) {
      throw new AppError('Password must be at least 8 characters long', 400);
    }

    if (!ValidationUtil.validatePassword(this.password)) {
      throw new AppError('Password must contain upper case, lower case, numbers and special characters', 400);
    }

    if (this.password !== this.confirmPassword) {
      throw new AppError('Password and Confirm Password must match', 400);
    }

    if (ValidationUtil.isEmpty(this.churchId)) {
      throw new AppError('Church ID is required to register a member', 400);
    }

    return true;
  }
}

module.exports = RegisterMemberDto;
