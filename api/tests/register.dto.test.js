const RegisterDto = require('../src/modules/auth/dtos/RegisterDto');
const { ValidationError } = require('../src/shared/errors/AppError');

describe('RegisterDto', () => {
  describe('validation', () => {
    it('should validate correct register data', () => {
      const dto = new RegisterDto({
        name: 'John Doe',
        email: 'john@test.com',
        password: 'Password123',
        confirmPassword: 'Password123',
      });

      expect(() => dto.validate()).not.toThrow();
    });

    it('should throw error for missing name', () => {
      const dto = new RegisterDto({
        name: '',
        email: 'john@test.com',
        password: 'Password123',
        churchId: 'church-123',
      });

      expect(() => dto.validate()).toThrow(ValidationError);
    });

    it('should throw error for invalid email', () => {
      const dto = new RegisterDto({
        name: 'John Doe',
        email: 'invalid-email',
        password: 'Password123',
        churchId: 'church-123',
      });

      expect(() => dto.validate()).toThrow(ValidationError);
    });

    it('should throw error for weak password', () => {
      const dto = new RegisterDto({
        name: 'John Doe',
        email: 'john@test.com',
        password: 'weak',
        churchId: 'church-123',
      });

      expect(() => dto.validate()).toThrow(ValidationError);
    });
  });
});
