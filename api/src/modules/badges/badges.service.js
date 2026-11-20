const { getPrismaClient } = require('../../config/database');
const conversationService = require('../conversations/conversation.service');

// Data enviada pelo telemóvel (o que a pessoa já viu); inválida ou ausente não conta nada
const sinceOf = (value) => {
  const date = value ? new Date(value) : null;
  return date && !Number.isNaN(date.getTime()) ? date : null;
};

/**
 * Números dos ícones da barra: conversas privadas por ler, mensagens novas no chat da comunidade e
 * novidades no feed (publicações, orações, enquetes, encontros e devocionais), sem contar as da própria
 * pessoa nem as de quem ela bloqueou.
 */
const badges = async (user, { chatSince, feedSince } = {}) => {
  if (!user.churchId) return { messages: 0, chat: 0, feed: 0 };
  const prisma = getPrismaClient();
  const blocked = (await prisma.blockedUser.findMany({ where: { blockerId: user.id }, select: { blockedId: true } })).map((b) => b.blockedId);
  const others = [user.id, ...blocked];
  const churchId = user.churchId;
  const chat = sinceOf(chatSince);
  const feed = sinceOf(feedSince);
  const after = (since) => ({ churchId, createdAt: { gt: since } });

  const [messages, chatCount, ...feedCounts] = await Promise.all([
    conversationService.unreadTotal(user),
    chat ? prisma.message.count({ where: { ...after(chat), hiddenAt: null, userId: { notIn: others } } }) : 0,
    ...(feed ? [
      prisma.post.count({ where: { ...after(feed), userId: { notIn: others } } }),
      prisma.prayerRequest.count({ where: { ...after(feed), userId: { notIn: others } } }),
      prisma.poll.count({ where: { ...after(feed), createdBy: { notIn: others } } }),
      prisma.event.count({ where: { ...after(feed), createdBy: { notIn: others } } }),
      prisma.devotional.count({ where: { ...after(feed), userId: { notIn: others } } }),
    ] : []),
  ]);
  return { messages, chat: chatCount, feed: feedCounts.reduce((sum, n) => sum + n, 0) };
};

module.exports = { badges };
