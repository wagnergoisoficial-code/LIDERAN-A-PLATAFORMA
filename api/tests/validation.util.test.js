const ValidationUtil = require('../src/shared/utils/validation.util');

describe('ValidationUtil', () => {
  describe('validateEmail', () => {
    it('should validate correct emails', () => {
      expect(ValidationUtil.validateEmail('test@example.com')).toBe(true);
      expect(ValidationUtil.validateEmail('user@domain.co.uk')).toBe(true);
    });

    it('should reject invalid emails', () => {
      expect(ValidationUtil.validateEmail('invalid')).toBe(false);
      expect(ValidationUtil.validateEmail('test@')).toBe(false);
      expect(ValidationUtil.validateEmail('@example.com')).toBe(false);
    });
  });

  describe('validatePassword', () => {
    it('should validate strong passwords', () => {
      expect(ValidationUtil.validatePassword('Password123')).toBe(true);
      expect(ValidationUtil.validatePassword('MyP@ssw0rd')).toBe(true);
    });

    it('should reject weak passwords', () => {
      expect(ValidationUtil.validatePassword('weak')).toBe(false);
      expect(ValidationUtil.validatePassword('12345678')).toBe(false);
      expect(ValidationUtil.validatePassword('password')).toBe(false);
    });
  });

  describe('isEmpty', () => {
    it('should identify empty values', () => {
      expect(ValidationUtil.isEmpty('')).toBe(true);
      expect(ValidationUtil.isEmpty(null)).toBe(true);
      expect(ValidationUtil.isEmpty(undefined)).toBe(true);
      expect(ValidationUtil.isEmpty('   ')).toBe(true);
    });

    it('should identify non-empty values', () => {
      expect(ValidationUtil.isEmpty('text')).toBe(false);
      expect(ValidationUtil.isEmpty('0')).toBe(false);
    });
  });
});
