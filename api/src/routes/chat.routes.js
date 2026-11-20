const express = require('express');
const chatController = require('../modules/chat/chat.controller');
const authMiddleware = require('../shared/middlewares/auth.middleware');

const router = express.Router();

/**
 * @swagger
 * /api/chat/messages:
 *   get:
 *     summary: Get messages for user's church
 *     tags: [Chat]
 *     security:
 *       - BearerAuth: []
 *     parameters:
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *           default: 50
 *         description: Number of messages to fetch
 *       - in: query
 *         name: lastMessageId
 *         schema:
 *           type: string
 *         description: ID of the last message for pagination
 *     responses:
 *       200:
 *         description: List of messages
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 data:
 *                   type: array
 *                   items:
 *                     type: object
 *       401:
 *         description: Unauthorized
 *       500:
 *         description: Server error
 */
router.get('/messages', authMiddleware, (req, res, next) => chatController.getMessages(req, res, next));

/**
 * @swagger
 * /api/chat/messages:
 *   post:
 *     summary: Send a message
 *     tags: [Chat]
 *     security:
 *       - BearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               content:
 *                 type: string
 *                 description: Message content
 *             required:
 *               - content
 *     responses:
 *       201:
 *         description: Message sent successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 data:
 *                   type: object
 *       400:
 *         description: Bad request
 *       401:
 *         description: Unauthorized
 *       500:
 *         description: Server error
 */
router.post('/messages', authMiddleware, (req, res, next) => chatController.sendMessage(req, res, next));

/**
 * @swagger
 * /api/chat/messages/{messageId}:
 *   delete:
 *     summary: Delete a message (only owner can delete)
 *     tags: [Chat]
 *     security:
 *       - BearerAuth: []
 *     parameters:
 *       - in: path
 *         name: messageId
 *         required: true
 *         schema:
 *           type: string
 *         description: ID of the message to delete
 *     responses:
 *       200:
 *         description: Message deleted successfully
 *       401:
 *         description: Unauthorized
 *       404:
 *         description: Message not found
 *       500:
 *         description: Server error
 */
router.delete('/messages/:messageId', authMiddleware, (req, res, next) => chatController.deleteMessage(req, res, next));

module.exports = router;
