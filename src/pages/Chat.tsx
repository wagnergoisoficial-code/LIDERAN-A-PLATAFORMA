import React, { useState, useEffect, useRef } from 'react';
import { api } from '../services/api';
import { useAuth } from '../context/AuthContext';
import UIkit from 'uikit';

interface Message {
  id: string;
  content: string;
  user: {
    id: string;
    name: string;
    profileImage?: string;
  };
  createdAt: string;
}

const Chat = () => {
  const { user } = useAuth();
  const [messages, setMessages] = useState<Message[]>([]);
  const [newMessage, setNewMessage] = useState('');
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const pollIntervalRef = useRef<NodeJS.Timeout | null>(null);

  // Scroll to bottom when new messages arrive
  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  // Format date
  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    const today = new Date();
    const isToday = date.toDateString() === today.toDateString();

    if (isToday) {
      return date.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });
    } else {
      return date.toLocaleDateString('pt-BR', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' });
    }
  };

  // Load messages from server
  const loadMessages = async () => {
    try {
      const result = await api.getMessages(50);
      if (result.success) {
        setMessages(result.data);
        setLoading(false);
      }
    } catch (err: any) {
      console.error('Erro ao carregar mensagens:', err);
      setLoading(false);
    }
  };

  // Initial load
  useEffect(() => {
    loadMessages();
  }, []);

  // Scroll to bottom when messages change
  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  // Set up polling every 1 second
  useEffect(() => {
    const startPolling = () => {
      pollIntervalRef.current = setInterval(() => {
        loadMessages();
      }, 1000);
    };

    startPolling();

    return () => {
      if (pollIntervalRef.current) {
        clearInterval(pollIntervalRef.current);
      }
    };
  }, []);

  // Send message
  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!newMessage.trim()) return;

    setSending(true);
    try {
      const result = await api.sendMessage(newMessage.trim());

      if (result.success) {
        setNewMessage('');
        await loadMessages();
      } else {
        UIkit.notification({
          message: result.error || 'Erro ao enviar mensagem',
          status: 'danger',
          timeout: 3000,
        });
      }
    } catch (err: any) {
      console.error('Erro ao enviar mensagem:', err);
      UIkit.notification({
        message: err.message || 'Erro ao enviar mensagem',
        status: 'danger',
        timeout: 3000,
      });
    } finally {
      setSending(false);
    }
  };

  // Delete message (only own messages)
  const handleDeleteMessage = async (messageId: string, messageUserId: string) => {
    if (user?.id !== messageUserId) return;

    try {
      const result = await api.deleteMessage(messageId);
      if (result.success) {
        setMessages(messages.filter((msg) => msg.id !== messageId));
        UIkit.notification({
          message: 'Mensagem deletada',
          status: 'success',
          timeout: 2000,
        });
      }
    } catch (err: any) {
      console.error('Erro ao deletar mensagem:', err);
      UIkit.notification({
        message: err.message || 'Erro ao deletar mensagem',
        status: 'danger',
        timeout: 3000,
      });
    }
  };

  return (
    <div style={{ backgroundColor: '#ffffff', minHeight: '100vh', display: 'flex', flexDirection: 'column', padding: 0 }}>
      <style>{`
        .chat-page {
          background: #ffffff;
          display: flex;
          flex-direction: column;
          height: 100vh;
          font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;
        }

        .messages-area {
          flex: 1;
          overflow-y: auto;
          padding: 24px;
          display: flex;
          flex-direction: column;
          gap: 16px;
          scroll-behavior: smooth;
        }

        .messages-area::-webkit-scrollbar {
          width: 8px;
        }

        .messages-area::-webkit-scrollbar-track {
          background: transparent;
        }

        .messages-area::-webkit-scrollbar-thumb {
          background: #e0e0e0;
          border-radius: 4px;
        }

        .messages-area::-webkit-scrollbar-thumb:hover {
          background: #999;
        }

        .message-item {
          display: flex;
          gap: 12px;
          animation: fadeIn 0.3s ease-out;
        }

        @keyframes fadeIn {
          from {
            opacity: 0;
            transform: translateY(8px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }

        .message-avatar {
          width: 36px;
          height: 36px;
          border-radius: 50%;
          object-fit: cover;
          flex-shrink: 0;
        }

        .message-avatar-placeholder {
          width: 36px;
          height: 36px;
          border-radius: 50%;
          background: #e0e0e0;
          display: flex;
          align-items: center;
          justify-content: center;
          color: #666;
          font-weight: 600;
          font-size: 14px;
          flex-shrink: 0;
        }

        .message-body {
          flex: 1;
          display: flex;
          flex-direction: column;
          gap: 4px;
        }

        .message-header {
          display: flex;
          align-items: center;
          gap: 8px;
          font-size: 14px;
        }

        .message-name {
          font-weight: 600;
          color: #333;
        }

        .message-time {
          color: #999;
          font-size: 12px;
        }

        .message-text {
          color: #333;
          font-size: 14px;
          line-height: 1.4;
          word-wrap: break-word;
          word-break: break-word;
        }

        .message-actions {
          display: none;
          gap: 8px;
          margin-top: 4px;
        }

        .message-item:hover .message-actions {
          display: flex;
        }

        .delete-btn {
          background: none;
          border: none;
          color: #999;
          cursor: pointer;
          font-size: 12px;
          padding: 0;
          transition: color 0.2s;
        }

        .delete-btn:hover {
          color: #e74c3c;
        }

        .empty-state {
          flex: 1;
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          color: #999;
          padding: 40px 20px;
        }

        .empty-icon {
          font-size: 48px;
          margin-bottom: 12px;
        }

        .empty-text {
          font-size: 14px;
        }

        .loading {
          flex: 1;
          display: flex;
          align-items: center;
          justify-content: center;
        }

        .input-area {
          padding: 16px 24px 24px;
          background: #ffffff;
          border-top: 1px solid #f0f0f0;
          display: flex;
          gap: 12px;
          align-items: flex-end;
        }

        .input-wrapper {
          flex: 1;
          display: flex;
          align-items: center;
          background: #f5f5f5;
          border-radius: 8px;
          padding: 0 14px;
        }

        .message-input {
          flex: 1;
          border: none;
          background: transparent;
          outline: none;
          padding: 12px 0;
          font-size: 14px;
          font-family: inherit;
          color: #333;
          resize: none;
          max-height: 100px;
        }

        .message-input::placeholder {
          color: #999;
        }

        .send-btn {
          background: #1e87f0;
          color: white;
          border: none;
          padding: 10px 20px;
          border-radius: 6px;
          font-size: 14px;
          font-weight: 500;
          cursor: pointer;
          transition: background 0.2s;
          min-height: 40px;
          display: flex;
          align-items: center;
          gap: 8px;
        }

        .send-btn:hover:not(:disabled) {
          background: #0e5ec6;
        }

        .send-btn:disabled {
          opacity: 0.6;
          cursor: not-allowed;
        }
      `}</style>

      <div className="chat-page">
        {/* Messages Area */}
        <div className="messages-area">
          {loading ? (
            <div className="loading">
              <div uk-spinner="ratio: 2"></div>
            </div>
          ) : messages.length === 0 ? (
            <div className="empty-state">
              <div className="empty-icon">💬</div>
              <p className="empty-text">Nenhuma mensagem ainda. Seja o primeiro a conversar!</p>
            </div>
          ) : (
            messages.map((message) => (
              <div key={message.id} className="message-item">
                {message.user.profileImage ? (
                  <img
                    src={message.user.profileImage}
                    alt={message.user.name}
                    className="message-avatar"
                  />
                ) : (
                  <div className="message-avatar-placeholder">
                    {message.user.name.charAt(0).toUpperCase()}
                  </div>
                )}

                <div className="message-body">
                  <div className="message-header">
                    <span className="message-name">{message.user.name}</span>
                    <span className="message-time">{formatDate(message.createdAt)}</span>
                  </div>
                  <div className="message-text">{message.content}</div>
                  {user?.id === message.user.id && (
                    <div className="message-actions">
                      <button
                        className="delete-btn"
                        onClick={() => handleDeleteMessage(message.id, message.user.id)}
                        title="Deletar mensagem"
                      >
                        Deletar
                      </button>
                    </div>
                  )}
                </div>
              </div>
            ))
          )}
          <div ref={messagesEndRef} />
        </div>

        {/* Input Area */}
        <form onSubmit={handleSendMessage} className="input-area">
          <div className="input-wrapper">
            <input
              type="text"
              className="message-input"
              placeholder="Digite sua mensagem..."
              value={newMessage}
              onChange={(e) => setNewMessage(e.target.value)}
              disabled={sending}
              maxLength={500}
            />
          </div>
          <button
            type="submit"
            className="send-btn"
            disabled={sending || !newMessage.trim()}
          >
            {sending ? (
              <div uk-spinner="ratio: 0.4"></div>
            ) : (
              <>
                <span uk-icon="send"></span>
                Enviar
              </>
            )}
          </button>
        </form>
      </div>
    </div>
  );
};

export default Chat;
