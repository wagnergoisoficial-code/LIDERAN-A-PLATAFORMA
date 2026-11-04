const { getPrismaClient } = require('../../config/database');
const { NotFoundError, ValidationError, ForbiddenError } = require('../../shared/errors/AppError');
const { requireChurch } = require('../../shared/utils/church.util');
const { isMinor } = require('../../shared/utils/minor.util');

const MAX_LENGTH = 2000;
const PARTICIPANT_USER = { id: true, name: true, profileImage: true, role: true, birthDate: true, age: true, status: true };
const SENDER = { id: true, name: true, profileImage: true };
const PROTECTED_MESSAGE = 'Esta conversa envolve um menor de idade: as mensagens não podem ser apagadas.';

class ConversationService {
  get prisma() {
    return getPrismaClient();
  }

  // Conversa com um menor de idade: as mensagens ficam sempre guardadas
  isProtected(participants) {
    return participants.some((p) => isMinor(p.user));
  }

  format(conversation, userId) {
    const other = conversation.participants.find((p) => p.userId !== userId)?.user;
    const last = conversation.messages?.[0];
    return {
      id: conversation.id,
      with: other
        ? { id: other.id, name: other.name, profileImage: other.profileImage, role: other.role, isMinor: isMinor(other), status: other.status }
        : null,
      lastMessage: last
        ? { content: last.content, createdAt: last.createdAt, fromMe: last.senderId === userId }
        : null,
      lastMessageAt: conversation.lastMessageAt,
      protected: this.isProtected(conversation.participants),
    };
  }

  formatMessage(message, userId) {
    return {
      id: message.id,
      content: message.content,
      createdAt: message.createdAt,
      sender: message.sender,
      fromMe: message.senderId === userId,
    };
  }

  unreadWhere(conversationId, userId, lastReadAt) {
    return {
      conversationId,
      senderId: { not: userId },
      deletedAt: null,
      ...(lastReadAt && { createdAt: { gt: lastReadAt } }),
    };
  }

  includeSummary() {
    return {
      participants: { include: { user: { select: PARTICIPANT_USER } } },
      messages: { where: { deletedAt: null }, orderBy: { createdAt: 'desc' }, take: 1 },
    };
  }

  async list(user) {
    if (!user.churchId) return [];

    const conversations = await this.prisma.conversation.findMany({
      where: { churchId: user.churchId, participants: { some: { userId: user.id } } },
      include: this.includeSummary(),
      orderBy: { lastMessageAt: 'desc' },
      take: 100,
    });

    const unread = await Promise.all(
      conversations.map((c) => {
        const me = c.participants.find((p) => p.userId === user.id);
        return this.prisma.directMessage.count({ where: this.unreadWhere(c.id, user.id, me?.lastReadAt) });
      })
    );

    return conversations.map((c, i) => ({ ...this.format(c, user.id), unread: unread[i] }));
  }

  async unreadTotal(user) {
    if (!user.churchId) return 0;
    const memberships = await this.prisma.conversationParticipant.findMany({
      where: { userId: user.id, conversation: { churchId: user.churchId } },
      select: { conversationId: true, lastReadAt: true },
    });
    const counts = await Promise.all(
      memberships.map((m) => this.prisma.directMessage.count({ where: this.unreadWhere(m.conversationId, user.id, m.lastReadAt) }))
    );
    return counts.reduce((sum, n) => sum + n, 0);
  }

  async assertNotBlocked(userId, otherId) {
    const block = await this.prisma.blockedUser.findFirst({
      where: { OR: [{ blockerId: userId, blockedId: otherId }, { blockerId: otherId, blockedId: userId }] },
    });
    if (block) throw new ForbiddenError('Não é possível conversar com este membro');
  }

  // Abre a conversa privada com outro membro da mesma comunidade (ou cria-a)
  async start(user, otherUserId) {
    const churchId = requireChurch(user);

    if (!otherUserId || otherUserId === user.id) {
      throw new ValidationError('Escolha outro membro para conversar');
    }

    const other = await this.prisma.user.findUnique({
      where: { id: otherUserId },
      select: { ...PARTICIPANT_USER, churchId: true },
    });
    if (!other || other.churchId !== churchId) throw new NotFoundError('Membro não encontrado');
    if (other.status !== 'active') throw new ValidationError('Este membro não pode receber mensagens agora');
    await this.assertNotBlocked(user.id, other.id);

    const existing = await this.prisma.conversation.findFirst({
      where: {
        churchId,
        AND: [{ participants: { some: { userId: user.id } } }, { participants: { some: { userId: other.id } } }],
      },
      include: this.includeSummary(),
    });
    if (existing) return { ...this.format(existing, user.id), unread: 0 };

    const created = await this.prisma.conversation.create({
      data: {
        churchId,
        participants: { create: [{ userId: user.id, lastReadAt: new Date() }, { userId: other.id }] },
      },
      include: this.includeSummary(),
    });
    return { ...this.format(created, user.id), unread: 0 };
  }

  async findForParticipant(user, conversationId) {
    const conversation = await this.prisma.conversation.findFirst({
      where: { id: conversationId, participants: { some: { userId: user.id } } },
      include: { participants: { include: { user: { select: PARTICIPANT_USER } } } },
    });
    if (!conversation) throw new NotFoundError('Conversa não encontrada');
    return conversation;
  }

  // Últimas mensagens (ou só as posteriores a "after", para atualizar a conversa aberta)
  async messages(user, conversationId, { after } = {}) {
    const conversation = await this.findForParticipant(user, conversationId);
    const afterDate = after ? new Date(after) : null;

    const messages = await this.prisma.directMessage.findMany({
      where: {
        conversationId,
        deletedAt: null,
        ...(afterDate && !Number.isNaN(afterDate.getTime()) && { createdAt: { gt: afterDate } }),
      },
      include: { sender: { select: SENDER } },
      orderBy: { createdAt: 'desc' },
      take: 100,
    });

    return {
      conversation: this.format(conversation, user.id),
      messages: messages.reverse().map((m) => this.formatMessage(m, user.id)),
    };
  }

  async send(user, conversationId, content) {
    const conversation = await this.findForParticipant(user, conversationId);
    const text = typeof content === 'string' ? content.trim() : '';

    if (!text) throw new ValidationError('Escreva uma mensagem');
    if (text.length > MAX_LENGTH) throw new ValidationError(`A mensagem pode ter no máximo ${MAX_LENGTH} caracteres`);

    const other = conversation.participants.find((p) => p.userId !== user.id)?.user;
    if (!other || other.status === 'blocked') throw new ValidationError('Este membro não pode receber mensagens');
    await this.assertNotBlocked(user.id, other.id);

    const now = new Date();
    const [message] = await this.prisma.$transaction([
      this.prisma.directMessage.create({
        data: { conversationId, senderId: user.id, content: text },
        include: { sender: { select: SENDER } },
      }),
      this.prisma.conversation.update({ where: { id: conversationId }, data: { lastMessageAt: now } }),
      this.prisma.conversationParticipant.update({
        where: { conversationId_userId: { conversationId, userId: user.id } },
        data: { lastReadAt: now },
      }),
    ]);

    return this.formatMessage(message, user.id);
  }

  // Apagar só é possível nas conversas entre adultos (a mensagem fica oculta para os dois)
  async deleteMessage(user, conversationId, messageId) {
    const conversation = await this.findForParticipant(user, conversationId);
    if (this.isProtected(conversation.participants)) throw new ForbiddenError(PROTECTED_MESSAGE);

    const message = await this.prisma.directMessage.findFirst({ where: { id: messageId, conversationId, deletedAt: null } });
    if (!message) throw new NotFoundError('Mensagem não encontrada');
    if (message.senderId !== user.id) throw new ForbiddenError('Você só pode apagar as suas mensagens');

    await this.prisma.directMessage.update({ where: { id: messageId }, data: { deletedAt: new Date() } });
    return { id: messageId };
  }

  async markRead(user, conversationId) {
    await this.findForParticipant(user, conversationId);
    await this.prisma.conversationParticipant.update({
      where: { conversationId_userId: { conversationId, userId: user.id } },
      data: { lastReadAt: new Date() },
    });
    return { id: conversationId };
  }
}

ConversationService.PROTECTED_MESSAGE = PROTECTED_MESSAGE;

module.exports = new ConversationService();
