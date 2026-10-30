const { getPrismaClient } = require('../../config/database');
const { NotFoundError, ValidationError } = require('../../shared/errors/AppError');
const { requireChurch, assertSameChurch, assertOwnerOrLeader } = require('../../shared/utils/church.util');

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

    const where = { churchId: user.churchId };
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

  // O autor ou um líder da comunidade pode apagar
  async deleteMessage(messageId, user) {
    const message = await this.prisma.message.findUnique({ where: { id: messageId } });

    if (!message) throw new NotFoundError('Mensagem não encontrada');

    assertSameChurch(user, message.churchId, 'Mensagem não encontrada');
    assertOwnerOrLeader(user, message.userId, 'Você só pode apagar as suas mensagens');

    await this.prisma.message.delete({ where: { id: messageId } });
    return { id: messageId };
  }
}

module.exports = new ChatService();
