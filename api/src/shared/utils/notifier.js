const { getPrismaClient } = require('../../config/database');

// As notificações nunca devem fazer falhar a ação principal
const notifyUsers = async (userIds, { type, title, body, linkId = null, linkType = null }) => {
  const ids = [...new Set((userIds || []).filter(Boolean))];
  if (!ids.length) return;

  try {
    await getPrismaClient().notification.createMany({
      data: ids.map((userId) => ({
        userId,
        type,
        title,
        body: String(body || '').slice(0, 200),
        linkId,
        linkType,
      })),
    });
  } catch (err) {
    console.error('Falha ao criar notificações:', err.message);
  }
};

const notifyUser = (userId, payload) => notifyUsers([userId], payload);

// Notifica todos os membros da comunidade, exceto quem originou a ação
const notifyChurch = async (churchId, exceptUserId, payload) => {
  if (!churchId) return;

  try {
    const members = await getPrismaClient().user.findMany({
      where: { churchId, ...(exceptUserId && { id: { not: exceptUserId } }) },
      select: { id: true },
    });
    await notifyUsers(members.map((m) => m.id), payload);
  } catch (err) {
    console.error('Falha ao notificar a comunidade:', err.message);
  }
};

const preview = (text, size = 80) => {
  const clean = String(text || '').replace(/\s+/g, ' ').trim();
  return clean.length > size ? `${clean.slice(0, size - 1)}…` : clean;
};

module.exports = { notifyUsers, notifyUser, notifyChurch, preview };
