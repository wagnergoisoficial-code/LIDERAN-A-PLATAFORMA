const AuthService = require('../src/modules/auth/services/AuthService');
const RegisterDto = require('../src/modules/auth/dtos/RegisterDto');
const {
  ConflictError,
  AuthenticationError,
} = require('../src/shared/errors/AppError');

describe('AuthService', () => {
  let authService;
  let mockUserRepository;

  beforeEach(() => {
    // Mock repository
    mockUserRepository = {
      findByEmail: jest.fn(),
      create: jest.fn(),
    };

    authService = new AuthService(mockUserRepository);
  });

  describe('register', () => {
    it('should register a new user successfully', async () => {
      const registerDto = new RegisterDto({
        name: 'John Doe',
        email: 'john@test.com',
        password: 'Password123',
        churchId: 'church-123',
      });

      mockUserRepository.findByEmail.mockResolvedValue(null);
      mockUserRepository.create.mockResolvedValue({
        id: 'user-123',
        name: 'John Doe',
        email: 'john@test.com',
        role: 'member',
      });

      const result = await authService.register(registerDto);

      expect(result).toHaveProperty('user');
      expect(result).toHaveProperty('token');
      expect(result.user.email).toBe('john@test.com');
    });

    it('should throw ConflictError if email exists', async () => {
      const registerDto = new RegisterDto({
        name: 'John Doe',
        email: 'john@test.com',
        password: 'Password123',
        churchId: 'church-123',
      });

      mockUserRepository.findByEmail.mockResolvedValue({
        id: 'user-123',
        email: 'john@test.com',
      });

      await expect(authService.register(registerDto)).rejects.toThrow(
        ConflictError
      );
    });
  });

  describe('login', () => {
    it('should login successfully', async () => {
      const loginDto = {
        email: 'john@test.com',
        password: 'Password123',
      };

      const mockUser = {
        id: 'user-123',
        email: 'john@test.com',
        name: 'John Doe',
        role: 'member',
        password: '$2b$10$abcdefgh...', // hashed password
      };

      mockUserRepository.findByEmail.mockResolvedValue(mockUser);

      // Mock bcrypt.compare
      jest.mock('bcrypt', () => ({
        compare: jest.fn().mockResolvedValue(true),
      }));

      const result = await authService.login(loginDto);

      expect(result).toHaveProperty('user');
      expect(result).toHaveProperty('token');
    });

    it('should throw AuthenticationError for invalid email', async () => {
      const loginDto = {
        email: 'nonexistent@test.com',
        password: 'Password123',
      };

      mockUserRepository.findByEmail.mockResolvedValue(null);

      await expect(authService.login(loginDto)).rejects.toThrow(
        AuthenticationError
      );
    });
  });
});
