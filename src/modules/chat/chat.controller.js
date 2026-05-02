const chatService = require('./chat.service');

class ChatController {
  async sendMessage(req, res) {
    try {
      const { content } = req.body;
      const userId = req.user.id;
      const churchId = req.user.churchId;

      if (!churchId) {
        return res.status(400).json({
          success: false,
          error: 'User must belong to a church to send messages',
        });
      }

      if (!content || content.trim() === '') {
        return res.status(400).json({
          success: false,
          error: 'Message content cannot be empty',
        });
      }

      const message = await chatService.sendMessage(userId, churchId, content.trim());

      res.status(201).json({
        success: true,
        data: message,
        message: 'Message sent successfully',
      });
    } catch (err) {
      res.status(500).json({
        success: false,
        error: err.message,
      });
    }
  }

  async getMessages(req, res) {
    try {
      const userId = req.user.id;
      const churchId = req.user.churchId;
      const { limit = 50, lastMessageId = null } = req.query;

      if (!churchId) {
        return res.status(400).json({
          success: false,
          error: 'User must belong to a church to view messages',
        });
      }

      const messages = await chatService.getMessages(churchId, parseInt(limit), lastMessageId);

      res.status(200).json({
        success: true,
        data: messages,
        count: messages.length,
      });
    } catch (err) {
      res.status(500).json({
        success: false,
        error: err.message,
      });
    }
  }

  async deleteMessage(req, res) {
    try {
      const { messageId } = req.params;
      const userId = req.user.id;

      const result = await chatService.deleteMessage(messageId, userId);

      res.status(200).json({
        success: true,
        data: result,
      });
    } catch (err) {
      res.status(500).json({
        success: false,
        error: err.message,
      });
    }
  }
}

module.exports = new ChatController();
