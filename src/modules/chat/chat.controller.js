const chatService = require('./chat.service');

class ChatController {
  async sendMessage(req, res, next) {
    try {
      const message = await chatService.sendMessage(req.user, req.body.content);

      res.status(201).json({
        success: true,
        data: message,
        message: 'Mensagem enviada',
      });
    } catch (err) {
      next(err);
    }
  }

  async getMessages(req, res, next) {
    try {
      const { limit = 50, lastMessageId = null } = req.query;
      const messages = await chatService.getMessages(req.user, limit, lastMessageId);

      res.status(200).json({
        success: true,
        data: messages,
        count: messages.length,
      });
    } catch (err) {
      next(err);
    }
  }

  async deleteMessage(req, res, next) {
    try {
      const result = await chatService.deleteMessage(req.params.messageId, req.user);

      res.status(200).json({
        success: true,
        message: 'Mensagem apagada',
        data: result,
      });
    } catch (err) {
      next(err);
    }
  }
}

module.exports = new ChatController();
