const bcrypt = require('bcrypt');
const JwtUtil = require('../../../shared/utils/jwt.util');
const { getPrismaClient } = require('../../../config/database');
const { canManageChurch } = require('../../../shared/utils/church.util');
const { assertAccountActive } = require('../../../shared/utils/account-status.util');
const guardianService = require('../../guardians/guardian.service');
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

    // Só depois da senha certa se revela que a conta está suspensa, bloqueada ou à espera dos pais
    const activeUser = await assertAccountActive(user);

    return this.formatAuthResponse(activeUser, this.signToken(activeUser));
  }

  // Dados atuais do utilizador com um token renovado
  async me(userId) {
    const user = await this.userRepository.findById(userId);

    if (!user) {
      throw new AuthenticationError('Sessão inválida. Faça login novamente.');
    }

    return this.formatAuthResponse(user, this.signToken(user));
  }

  // Um líder cadastra um membro numa comunidade que gere.
  // Menores de 18 anos ficam ligados a um responsável e à espera da autorização dos pais.
  async registerMember(registerMemberDto, requester) {
    const prisma = getPrismaClient();
    const church = await prisma.church.findUnique({ where: { id: registerMemberDto.churchId } });

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

    const minor = registerMemberDto.age < 18;
    const hashedPassword = await bcrypt.hash(registerMemberDto.password, 10);

    return prisma.$transaction(async (tx) => {
      const guardian = minor ? await guardianService.resolveGuardian(tx, registerMemberDto.guardian, requester) : null;

      const user = await tx.user.create({
        data: {
          name: registerMemberDto.name,
          email: registerMemberDto.email,
          password: hashedPassword,
          churchId: church.id,
          role: 'member',
          leaderId: requester.id,
          birthDate: registerMemberDto.birthDate,
          age: registerMemberDto.age,
          title: registerMemberDto.title,
          location: registerMemberDto.location,
          status: minor ? 'pending_authorization' : 'active',
        },
      });

      if (guardian) {
        await guardianService.link(tx, user.id, guardian.account.id, guardian.relationship);
      }

      return {
        user: this.formatUser(user),
        pendingAuthorization: minor,
        guardian: guardian
          ? { id: guardian.account.id, name: guardian.account.name, email: guardian.account.email, created: guardian.created }
          : null,
      };
    });
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
      status: user.status || 'active',
    };
  }

  formatAuthResponse(user, token) {
    return { user: this.formatUser(user), token };
  }
}

module.exports = AuthService;
