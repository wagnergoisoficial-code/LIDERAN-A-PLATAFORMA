const express = require('express');
const { getPrismaClient } = require('../config/database');
const authMiddleware = require('../shared/middlewares/auth.middleware');

const devotionalLikeRoute = express.Router();

devotionalLikeRoute.post('/:id/like', authMiddleware, async (req, res, next) => {
  try {
    const prisma = getPrismaClient();
    const { id: userId } = req.user;
    const devotionalId = req.params.id;

    const existing = await prisma.devotionalLike.findUnique({
      where: { devotionalId_userId: { devotionalId, userId } },
    });

    if (existing) {
      await prisma.devotionalLike.delete({ where: { id: existing.id } });
      const count = await prisma.devotionalLike.count({ where: { devotionalId } });
      return res.json({ success: true, liked: false, likeCount: count });
    }

    await prisma.devotionalLike.create({ data: { devotionalId, userId } });
    const count = await prisma.devotionalLike.count({ where: { devotionalId } });
    res.json({ success: true, liked: true, likeCount: count });
  } catch (e) { next(e); }
});

module.exports = devotionalLikeRoute;
