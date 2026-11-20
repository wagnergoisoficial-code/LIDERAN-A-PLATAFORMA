const bcrypt = require('bcrypt');
const { getPrismaClient } = require('../../config/database');
const ValidationUtil = require('../../shared/utils/validation.util');
const { isMinor } = require('../../shared/utils/minor.util');
const { isUploadUrl } = require('../../shared/utils/url.util');
const { notifyUser } = require('../../shared/utils/notifier');
const { PASSWORD_RULE_MESSAGE } = require('../auth/dtos/RegisterDto');
const { ValidationError, ConflictError, NotFoundError, ForbiddenError } = require('../../shared/errors/AppError');

const RELATIONSHIPS = ['pai', 'mae', 'tutor', 'outro'];
const USER_SUMMARY = { id: true, name: true, email: true, profileImage: true };
const MINOR_SELECT = { id: true, name: true, profileImage: true, birthDate: true, age: true, status: true, churchId: true };

class GuardianService {
  get prisma() {
    return getPrismaClient();
  }

  // Dados do responsável: e-mail sempre; nome e senha só quando a conta ainda não existe
  normalizeInput(input = {}) {
    const guardian = {
      name: typeof input.name === 'string' ? input.name.trim() : '',
      email: typeof input.email === 'string' ? input.email.trim() : '',
      password: input.password,
      confirmPassword: input.confirmPassword,
      relationship: RELATIONSHIPS.includes(input.relationship) ? input.relationship : 'outro',
    };
    if (!ValidationUtil.isValidEmail(guardian.email)) {
      throw new ValidationError('Informe um e-mail válido para o responsável');
    }
    return guardian;
  }

  // Devolve a conta do responsável: a existente (papel "guardian") ou uma nova criada agora
  async resolveGuardian(tx, input, requester) {
    const guardian = this.normalizeInput(input);
    const existing = await tx.user.findUnique({ where: { email: guardian.email } });

    if (existing) {
      if (existing.role !== 'guardian') {
        throw new ConflictError('Este e-mail já pertence a um membro. Use outro e-mail para a conta do responsável.');
      }
      return { account: existing, relationship: guardian.relationship, created: false };
    }

    if (guardian.name.length < 2) throw new ValidationError('Informe o nome do responsável');
    if (!guardian.password || !ValidationUtil.validatePassword(guardian.password)) {
      throw new ValidationError(`Senha do responsável: ${PASSWORD_RULE_MESSAGE.toLowerCase()}`);
    }
    if (guardian.confirmPassword !== undefined && guardian.password !== guardian.confirmPassword) {
      throw new ValidationError('As senhas do responsável não conferem');
    }

    const account = await tx.user.create({
      data: {
        name: guardian.name,
        email: guardian.email,
        password: await bcrypt.hash(guardian.password, 10),
        role: 'guardian',
        leaderId: requester.id,
      },
    });
    return { account, relationship: guardian.relationship, created: true };
  }

  async link(tx, minorId, guardianId, relationship) {
    return tx.guardianship.upsert({
      where: { guardianId_minorId: { guardianId, minorId } },
      update: { relationship },
      create: { guardianId, minorId, relationship },
    });
  }

  // Liga (ou cria) um responsável para um menor já cadastrado
  async addGuardian(minorId, input, requester) {
    const minor = await this.prisma.user.findUnique({ where: { id: minorId }, select: MINOR_SELECT });
    if (!minor) throw new NotFoundError('Membro não encontrado');
    if (!isMinor(minor)) throw new ValidationError('Só membros menores de 18 anos têm responsável');

    return this.prisma.$transaction(async (tx) => {
      const { account, relationship } = await this.resolveGuardian(tx, input, requester);
      await this.link(tx, minorId, account.id, relationship);
      return { id: account.id, name: account.name, email: account.email, relationship };
    });
  }

  // Regista a autorização dos pais e ativa a conta do menor.
  // method: leader_confirmation (líder com o termo assinado) ou guardian_app (o próprio responsável)
  async authorize(minorId, { actor, method, guardianId, proofUrl }) {
    if (proofUrl && !isUploadUrl(proofUrl)) throw new ValidationError('Foto do termo inválida');

    const links = await this.prisma.guardianship.findMany({ where: { minorId } });
    if (!links.length) {
      throw new ValidationError('Cadastre primeiro um responsável para este menor');
    }

    const target = guardianId ? links.find((l) => l.guardianId === guardianId) : links[0];
    if (!target) throw new ForbiddenError('Você não é responsável por este membro');

    const now = new Date();
    const [minor] = await this.prisma.$transaction([
      this.prisma.user.update({
        where: { id: minorId },
        data: { status: 'active', statusReason: null },
        select: MINOR_SELECT,
      }),
      this.prisma.guardianship.update({
        where: { id: target.id },
        data: { authorizedAt: now, authorizationMethod: method, authorizedById: actor.id, proofUrl: proofUrl || null },
      }),
      this.prisma.moderationAction.create({
        data: {
          action: 'authorize_minor',
          reason: method,
          userId: minorId,
          actorId: actor.id,
          churchId: actor.churchId || null,
        },
      }),
    ]);

    if (method === 'guardian_app') {
      const member = await this.prisma.user.findUnique({ where: { id: minorId }, select: { leaderId: true } });
      if (member?.leaderId) {
        await notifyUser(member.leaderId, {
          type: 'minor_authorized',
          title: 'Autorização recebida',
          body: `${actor.name} autorizou o cadastro de ${minor.name}`,
          linkType: 'member',
          linkId: minorId,
        });
      }
    }

    return minor;
  }

  // ── Área do responsável ──────────────────────────────────────

  async children(guardian) {
    const links = await this.prisma.guardianship.findMany({
      where: { guardianId: guardian.id },
      include: { minor: { select: MINOR_SELECT } },
      orderBy: { createdAt: 'asc' },
    });

    return Promise.all(
      links.map(async (link) => {
        const conversations = await this.prisma.conversation.findMany({
          where: { participants: { some: { userId: link.minorId } } },
          include: {
            participants: { include: { user: { select: { id: true, name: true, profileImage: true } } } },
            messages: { orderBy: { createdAt: 'desc' }, take: 1 },
            _count: { select: { messages: true } },
          },
          orderBy: { lastMessageAt: 'desc' },
        });

        return {
          id: link.minor.id,
          name: link.minor.name,
          profileImage: link.minor.profileImage,
          status: link.minor.status,
          relationship: link.relationship,
          authorizedAt: link.authorizedAt,
          pendingAuthorization: link.minor.status === 'pending_authorization',
          conversations: conversations.map((c) => {
            const other = c.participants.find((p) => p.userId !== link.minorId)?.user;
            const last = c.messages[0];
            return {
              id: c.id,
              with: other ? { id: other.id, name: other.name, profileImage: other.profileImage } : null,
              lastMessage: last ? { content: last.content, createdAt: last.createdAt, fromChild: last.senderId === link.minorId } : null,
              messageCount: c._count.messages,
              lastMessageAt: c.lastMessageAt,
            };
          }),
        };
      })
    );
  }

  async assertGuardianOf(guardian, minorId) {
    const link = await this.prisma.guardianship.findUnique({
      where: { guardianId_minorId: { guardianId: guardian.id, minorId } },
    });
    if (!link) throw new NotFoundError('Membro não encontrado');
    return link;
  }

  // Leitura (sem poder escrever) de uma conversa do filho
  async childConversation(guardian, minorId, conversationId) {
    await this.assertGuardianOf(guardian, minorId);

    const conversation = await this.prisma.conversation.findFirst({
      where: { id: conversationId, participants: { some: { userId: minorId } } },
      include: { participants: { include: { user: { select: USER_SUMMARY } } } },
    });
    if (!conversation) throw new NotFoundError('Conversa não encontrada');

    const messages = await this.prisma.directMessage.findMany({
      where: { conversationId },
      include: { sender: { select: { id: true, name: true, profileImage: true } } },
      orderBy: { createdAt: 'asc' },
      take: 500,
    });

    return {
      id: conversation.id,
      participants: conversation.participants.map((p) => ({ id: p.user.id, name: p.user.name, profileImage: p.user.profileImage })),
      messages: messages.map((m) => ({
        id: m.id,
        content: m.content,
        createdAt: m.createdAt,
        deletedAt: m.deletedAt,
        sender: m.sender,
        fromChild: m.senderId === minorId,
      })),
    };
  }

  // O responsável aprova o cadastro do filho na própria app
  async approveByGuardian(guardian, minorId) {
    await this.assertGuardianOf(guardian, minorId);
    return this.authorize(minorId, { actor: guardian, method: 'guardian_app', guardianId: guardian.id });
  }
}

GuardianService.RELATIONSHIPS = RELATIONSHIPS;

module.exports = new GuardianService();
