const express = require('express');
const { getPrismaClient } = require('../config/database');
const authMiddleware = require('../shared/middlewares/auth.middleware');
const { textContains } = require('../shared/utils/query.util');

const searchRoutes = express.Router();

searchRoutes.get('/', authMiddleware, async (req, res, next) => {
  try {
    const { q } = req.query;
    const { churchId } = req.user;

    if (!q || q.trim().length < 2) return res.json({ success: true, data: { posts: [], members: [], events: [], sermons: [] } });
    if (!churchId) return res.json({ success: true, data: { posts: [], members: [], events: [], sermons: [] } });

    const prisma = getPrismaClient();
    const term = q.trim();

    const [posts, members, events, sermons] = await Promise.all([
      prisma.post.findMany({
        where: { churchId, content: textContains(term) },
        include: { user: { select: { id: true, name: true, profileImage: true } } },
        orderBy: { createdAt: 'desc' },
        take: 5,
      }),
      prisma.user.findMany({
        where: { churchId, name: textContains(term) },
        select: { id: true, name: true, profileImage: true, role: true, title: true },
        take: 5,
      }),
      prisma.event.findMany({
        where: { churchId, title: textContains(term) },
        orderBy: { startDate: 'asc' },
        take: 5,
      }),
      prisma.sermonNote.findMany({
        where: { churchId, OR: [{ title: textContains(term) }, { speaker: textContains(term) }] },
        include: { author: { select: { id: true, name: true } } },
        orderBy: { date: 'desc' },
        take: 5,
      }),
    ]);

    res.json({ success: true, data: { posts, members, events, sermons } });
  } catch (e) { next(e); }
});

module.exports = searchRoutes;
