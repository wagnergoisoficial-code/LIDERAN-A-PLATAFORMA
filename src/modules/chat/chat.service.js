const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

class ChatService {
  async sendMessage(userId, churchId, content) {
    try {
      const message = await prisma.message.create({
        data: {
          userId,
          churchId,
          content,
        },
        include: {
          user: {
            select: {
              id: true,
              name: true,
              profileImage: true,
            },
          },
        },
      });

      return message;
    } catch (err) {
      throw new Error(`Error creating message: ${err.message}`);
    }
  }

  async getMessages(churchId, limit = 50, lastMessageId = null) {
    try {
      let query = {
        where: { churchId },
        include: {
          user: {
            select: {
              id: true,
              name: true,
              profileImage: true,
            },
          },
        },
        orderBy: { createdAt: 'desc' },
        take: limit,
      };

      // If lastMessageId is provided, get messages after that one for pagination
      if (lastMessageId) {
        const lastMessage = await prisma.message.findUnique({
          where: { id: lastMessageId },
        });

        if (lastMessage) {
          query.where.createdAt = {
            gt: lastMessage.createdAt,
          };
        }
      }

      const messages = await prisma.message.findMany(query);

      return messages.reverse(); // Return in ascending order (oldest first)
    } catch (err) {
      throw new Error(`Error fetching messages: ${err.message}`);
    }
  }

  async deleteMessage(messageId, userId) {
    try {
      const message = await prisma.message.findUnique({
        where: { id: messageId },
      });

      if (!message) {
        throw new Error('Message not found');
      }

      if (message.userId !== userId) {
        throw new Error('Unauthorized to delete this message');
      }

      await prisma.message.delete({
        where: { id: messageId },
      });

      return { success: true, message: 'Message deleted successfully' };
    } catch (err) {
      throw new Error(`Error deleting message: ${err.message}`);
    }
  }
}

module.exports = new ChatService();
