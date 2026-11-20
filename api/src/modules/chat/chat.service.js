const { getPrismaClient } = require('../../config/database');
const { NotFoundError, ValidationError, ForbiddenError } = require('../../shared/errors/AppError');
const { requireChurch, assertSameChurch, isLeaderOrAdmin } = require('../../shared/utils/church.util');
const { churchHasMinors } = require('../../shared/utils/minor.util');

const PROTECTED_MESSAGE = 'Há menores de idade nesta comunidade: as mensagens do chat não podem ser apagadas.';

const MAX_LENGTH = 500;
const USER_SELECT = { id: true, name: true, profileImage: true };

class ChatService {
  get prisma() {
    return getPrismaClient();
  }

  async sendMessage(user, content) {
    const churchId = requireChurch(user);
    const text = typeof content === 'string' ? content.trim() : '';

    if (!text) throw new ValidationError('Escreva uma mensagem');
    if (text.length > MAX_LENGTH) throw new ValidationError(`A mensagem pode ter no máximo ${MAX_LENGTH} caracteres`);

    return this.prisma.message.create({
      data: { userId: user.id, churchId, content: text },
      include: { user: { select: USER_SELECT } },
    });
  }

  // Últimas mensagens da comunidade (ou apenas as posteriores a lastMessageId)
  async getMessages(user, limit = 50, lastMessageId = null) {
    if (!user.churchId) return [];

    const take = Math.min(Math.max(parseInt(limit, 10) || 50, 1), 100);
    const blocked = await this.prisma.blockedUser.findMany({
      where: { blockerId: user.id },
      select: { blockedId: true },
    });

    const where = { churchId: user.churchId, hiddenAt: null };
    if (blocked.length) where.userId = { notIn: blocked.map((b) => b.blockedId) };

    if (lastMessageId) {
      const lastMessage = await this.prisma.message.findUnique({ where: { id: lastMessageId } });
      if (lastMessage && lastMessage.churchId === user.churchId) where.createdAt = { gt: lastMessage.createdAt };
    }

    const messages = await this.prisma.message.findMany({
      where,
      include: { user: { select: USER_SELECT } },
      orderBy: { createdAt: 'desc' },
      take,
    });

    return messages.reverse(); // mais antigas primeiro
  }

  // Com menores na comunidade, ninguém apaga as próprias mensagens.
  // Os líderes podem ocultar mensagens de outros (moderação); o conteúdo fica guardado.
  async deleteMessage(messageId, user) {
    const message = await this.prisma.message.findUnique({ where: { id: messageId } });

    if (!message || message.hiddenAt) throw new NotFoundError('Mensagem não encontrada');

    assertSameChurch(user, message.churchId, 'Mensagem não encontrada');

    const isAuthor = message.userId === user.id;
    if (!isAuthor && !isLeaderOrAdmin(user)) {
      throw new ForbiddenError('Você só pode apagar as suas mensagens');
    }
    if (isAuthor && (await churchHasMinors(this.prisma, message.churchId))) {
      throw new ForbiddenError(PROTECTED_MESSAGE);
    }

    await this.prisma.message.update({
      where: { id: messageId },
      data: { hiddenAt: new Date(), hiddenById: user.id },
    });

    if (!isAuthor) {
      await this.prisma.moderationAction.create({
        data: { action: 'hide_message', reason: messageId, churchId: message.churchId, userId: message.userId, actorId: user.id },
      });
    }

    return { id: messageId };
  }

  // O chat é protegido quando a comunidade tem menores (as mensagens não se apagam)
  async isProtected(user) {
    return user.churchId ? churchHasMinors(this.prisma, user.churchId) : false;
  }
}

module.exports = new ChatService();
