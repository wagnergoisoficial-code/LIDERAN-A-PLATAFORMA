const bcrypt = require('bcrypt');
const JwtUtil = require('../../../shared/utils/jwt.util');
const {
  ConflictError,
  AuthenticationError,
} = require('../../../shared/errors/AppError');

// Auth Service with business logic
class AuthService {
  constructor(userRepository) {
    this.userRepository = userRepository;
  }

  async register(registerDto) {
    // Check if user already exists
    const existingUser = await this.userRepository.findByEmail(
      registerDto.email
    );

    if (existingUser) {
      throw new ConflictError('Email already registered');
    }

    // Hash password
    const hashedPassword = await bcrypt.hash(registerDto.password, 10);

    // Create user - use role from DTO
    const user = await this.userRepository.create({
      name: registerDto.name,
      email: registerDto.email,
      password: hashedPassword,
      churchId: registerDto.churchId,
      role: registerDto.role || 'leader', // Leaders by default
    });

    // Generate token
    const token = JwtUtil.sign({
      id: user.id,
      email: user.email,
      role: user.role,
      churchId: user.churchId,
    });

    return this.formatAuthResponse(user, token);
  }

  async login(loginDto) {
    // Find user by email
    const user = await this.userRepository.findByEmail(loginDto.email);

    if (!user) {
      throw new AuthenticationError('Invalid credentials');
    }

    // Compare passwords
    const isPasswordValid = await bcrypt.compare(
      loginDto.password,
      user.password
    );

    if (!isPasswordValid) {
      throw new AuthenticationError('Invalid credentials');
    }

    // Generate token
    const token = JwtUtil.sign({
      id: user.id,
      email: user.email,
      role: user.role,
      churchId: user.churchId,
    });

    return this.formatAuthResponse(user, token);
  }

  async registerMember(registerMemberDto, leaderId) {
    // Check if user already exists
    const existingUser = await this.userRepository.findByEmail(
      registerMemberDto.email
    );

    if (existingUser) {
      throw new ConflictError('Email already registered');
    }

    // Hash password
    const hashedPassword = await bcrypt.hash(registerMemberDto.password, 10);

    // Create member user with 'member' role
    const user = await this.userRepository.create({
      name: registerMemberDto.name,
      email: registerMemberDto.email,
      password: hashedPassword,
      churchId: registerMemberDto.churchId,
      role: 'member',
      leaderId: leaderId,
      age: registerMemberDto.age || null,
      title: registerMemberDto.title || null,
      location: registerMemberDto.location || null,
    });

    // Generate token
    const token = JwtUtil.sign({
      id: user.id,
      email: user.email,
      role: user.role,
      churchId: user.churchId,
    });

    return this.formatAuthResponse(user, token);
  }

  formatAuthResponse(user, token) {
    return {
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        role: user.role,
        churchId: user.churchId,
      },
      token,
    };
  }
}

module.exports = AuthService;
