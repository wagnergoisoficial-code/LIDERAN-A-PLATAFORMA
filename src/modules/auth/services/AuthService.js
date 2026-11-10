const bcrypt = require('bcrypt');
const JwtUtil = require('../../../shared/utils/jwt.util');
const { getPrismaClient } = require('../../../config/database');
const { hasCargo } = require('../../../shared/utils/church.util');
const { ageFrom } = require('../../../shared/utils/minor.util');
const { assertAccountActive } = require('../../../shared/utils/account-status.util');
const guardianService = require('../../guardians/guardian.service');
const RegisterMemberDto = require('../dtos/RegisterMemberDto');
const { notifyUser } = require('../../../shared/utils/notifier');
const {
  ConflictError,
  AuthenticationError,
  NotFoundError,
  ForbiddenError,
  ValidationError,
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
      ...(registerDto.birthDate && { birthDate: registerDto.birthDate, age: ageFrom(registerDto.birthDate) }),
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

    if (!hasCargo(requester, church, 'secretario')) {
      throw new ForbiddenError('Apenas a liderança e a secretaria desta comunidade podem cadastrar membros');
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

  // Link de convite: só vale para comunidades de líderes verificados
  async findInvite(code) {
    const prisma = getPrismaClient();
    const church = typeof code === 'string' && code.length >= 8
      ? await prisma.church.findUnique({ where: { inviteCode: code } })
      : null;
    const leader = church?.leaderID ? await prisma.user.findUnique({ where: { id: church.leaderID } }) : null;
    if (!church || !leader || (leader.role !== 'admin' && !leader.leaderVerifiedAt)) {
      throw new NotFoundError('Este convite não é válido. Peça um link novo ao seu líder.');
    }
    return { church, leader };
  }

  async inviteInfo(code) {
    const { church } = await this.findInvite(code);
    return { church: { name: church.name, title: church.title || null } };
  }

  // Quem se regista pelo convite entra logo na comunidade. Menores não: o líder cadastra-os
  // com o responsável, para a autorização dos pais não depender de uma conta criada pelo menor.
  async registerByInvite(code, data) {
    const { church, leader } = await this.findInvite(code);
    const { guardian, ...rest } = data || {};
    const dto = new RegisterMemberDto({ ...rest, churchId: church.id });
    if (dto.birthDate && !Number.isNaN(dto.birthDate.getTime()) && dto.age < 18) {
      throw new ValidationError('Menores de 18 anos são cadastrados pelo líder da comunidade, com a autorização dos pais. Fale com o seu líder.');
    }
    dto.validate();

    const { user } = await this.registerMember(dto, leader);
    await notifyUser(leader.id, {
      type: 'member_joined',
      title: `${user.name} entrou pelo link de convite`,
      body: church.name,
      linkId: user.id,
      linkType: 'member',
    });
    return this.formatAuthResponse(user, this.signToken(user));
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
      leaderVerified: !!user.leaderVerifiedAt,
      cargo: user.cargo || null,
      birthDate: user.birthDate || null,
    };
  }

  formatAuthResponse(user, token) {
    return { user: this.formatUser(user), token };
  }
}

module.exports = AuthService;
