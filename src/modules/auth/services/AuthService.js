const bcrypt = require('bcrypt');
const JwtUtil = require('../../../shared/utils/jwt.util');
const { getPrismaClient } = require('../../../config/database');
const { canManageChurch } = require('../../../shared/utils/church.util');
const {
  ConflictError,
  AuthenticationError,
  NotFoundError,
  ForbiddenError,
} = require('../../../shared/errors/AppError');

// Authentication service with business logic
class AuthService {
  constructor(userRepository) {
    this.userRepository = userRepository;
  }

  async register(registerDto) {
    const existingUser = await this.userRepository.findByEmail(registerDto.email);

    if (existingUser) {
      throw new ConflictError('Este e-mail já está cadastrado');
    }

    const hashedPassword = await bcrypt.hash(registerDto.password, 10);

    const user = await this.userRepository.create({
      name: registerDto.name,
      email: registerDto.email,
      password: hashedPassword,
      role: registerDto.role,
    });

    return this.formatAuthResponse(user, this.signToken(user));
  }

  async login(loginDto) {
    const user = await this.userRepository.findByEmail(loginDto.email);

    if (!user) {
      throw new AuthenticationError('E-mail ou senha inválidos');
    }

    const isPasswordValid = await bcrypt.compare(loginDto.password, user.password);

    if (!isPasswordValid) {
      throw new AuthenticationError('E-mail ou senha inválidos');
    }

    return this.formatAuthResponse(user, this.signToken(user));
  }

  // Dados atuais do utilizador com um token renovado
  async me(userId) {
    const user = await this.userRepository.findById(userId);

    if (!user) {
      throw new AuthenticationError('Sessão inválida. Faça login novamente.');
    }

    return this.formatAuthResponse(user, this.signToken(user));
  }

  // Um líder cadastra um membro numa comunidade que gere
  async registerMember(registerMemberDto, requester) {
    const church = await getPrismaClient().church.findUnique({ where: { id: registerMemberDto.churchId } });

    if (!church) {
      throw new NotFoundError('Comunidade não encontrada');
    }

    if (!canManageChurch(requester, church)) {
      throw new ForbiddenError('Apenas os líderes desta comunidade podem cadastrar membros');
    }

    const existingUser = await this.userRepository.findByEmail(registerMemberDto.email);

    if (existingUser) {
      throw new ConflictError('Este e-mail já está cadastrado');
    }

    const hashedPassword = await bcrypt.hash(registerMemberDto.password, 10);

    const user = await this.userRepository.create({
      name: registerMemberDto.name,
      email: registerMemberDto.email,
      password: hashedPassword,
      churchId: church.id,
      role: 'member',
      leaderId: requester.id,
      age: registerMemberDto.age,
      title: registerMemberDto.title,
      location: registerMemberDto.location,
    });

    return this.formatUser(user);
  }

  signToken(user) {
    return JwtUtil.sign({
      id: user.id,
      email: user.email,
      role: user.role,
      churchId: user.churchId,
    });
  }

  formatUser(user) {
    return {
      id: user.id,
      name: user.name,
      email: user.email,
      role: user.role,
      churchId: user.churchId,
      profileImage: user.profileImage || null,
      title: user.title || null,
    };
  }

  formatAuthResponse(user, token) {
    return { user: this.formatUser(user), token };
  }
}

module.exports = AuthService;
