const JwtUtil = require('../src/shared/utils/jwt.util');

describe('JwtUtil', () => {
  const payload = {
    id: 'user-123',
    email: 'test@example.com',
    role: 'member',
  };

  describe('sign', () => {
    it('should create a valid JWT token', () => {
      const token = JwtUtil.sign(payload);

      expect(token).toBeDefined();
      expect(typeof token).toBe('string');
      expect(token.split('.').length).toBe(3); // JWT has 3 parts
    });
  });

  describe('verify', () => {
    it('should verify a valid token', () => {
      const token = JwtUtil.sign(payload);
      const decoded = JwtUtil.verify(token);

      expect(decoded.id).toBe(payload.id);
      expect(decoded.email).toBe(payload.email);
      expect(decoded.role).toBe(payload.role);
    });

    it('should throw error for invalid token', () => {
      expect(() => JwtUtil.verify('invalid-token')).toThrow();
    });
  });

  describe('decode', () => {
    it('should decode token without verification', () => {
      const token = JwtUtil.sign(payload);
      const decoded = JwtUtil.decode(token);

      expect(decoded.id).toBe(payload.id);
    });
  });
});
