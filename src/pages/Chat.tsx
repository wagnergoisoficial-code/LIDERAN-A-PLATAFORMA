import React, { useState, useEffect, useRef } from 'react';
import { api } from '../services/api';
import { useAuth } from '../context/AuthContext';
import UIkit from 'uikit';
import Avatar from '../components/Avatar';

interface Message {
  id: string;
  content: string;
  user: { id: string; name: string; profileImage?: string };
  createdAt: string;
}

const formatDate = (dateString: string) => {
  const date = new Date(dateString);
  const isToday = date.toDateString() === new Date().toDateString();
  return isToday
    ? date.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })
    : date.toLocaleDateString('pt-BR', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' });
};

const Chat = () => {
  const { user } = useAuth();
  const [messages, setMessages] = useState<Message[]>([]);
  const [newMessage, setNewMessage] = useState('');
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const pollRef = useRef<NodeJS.Timeout | null>(null);

  const scrollToBottom = () => messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });

  const loadMessages = async () => {
    try {
      const result = await api.getMessages(50);
      if (result.success) { setMessages(result.data); setLoading(false); }
    } catch { setLoading(false); }
  };

  useEffect(() => { loadMessages(); }, []);
  useEffect(() => { scrollToBottom(); }, [messages]);
  useEffect(() => {
    pollRef.current = setInterval(loadMessages, 1000);
    return () => { if (pollRef.current) clearInterval(pollRef.current); };
  }, []);

  const handleSend = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newMessage.trim()) return;
    setSending(true);
    try {
      const result = await api.sendMessage(newMessage.trim());
      if (result.success) { setNewMessage(''); await loadMessages(); }
      else UIkit.notification({ message: result.error || 'Erro ao enviar', status: 'danger', timeout: 3000 });
    } catch (err: any) {
      UIkit.notification({ message: err.message || 'Erro ao enviar', status: 'danger', timeout: 3000 });
    } finally {
      setSending(false);
    }
  };

  const handleDelete = async (messageId: string, messageUserId: string) => {
    if (user?.id !== messageUserId) return;
    try {
      const result = await api.deleteMessage(messageId);
      if (result.success) {
        setMessages(messages.filter(m => m.id !== messageId));
        UIkit.notification({ message: 'Mensagem removida', status: 'success', timeout: 2000 });
      }
    } catch (err: any) {
      UIkit.notification({ message: err.message || 'Erro ao deletar', status: 'danger', timeout: 3000 });
    }
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: 'calc(100vh - 90px)', background: 'var(--bg)', border: '1px solid var(--border)' }}>

      {/* Chat header */}
      <div style={{ padding: '12px 20px', borderBottom: '1px solid var(--border)', background: 'var(--bg-surface)', display: 'flex', alignItems: 'center', gap: '10px', flexShrink: 0 }}>
        <span uk-icon="icon: commenting; ratio: 0.9" style={{ color: 'var(--accent)' }}></span>
        <div>
          <div style={{ fontSize: '13px', fontWeight: 600, color: 'var(--text)' }}>Chat da Comunidade</div>
          <div style={{ fontSize: '11px', color: 'var(--text-faint)' }}>Mensagens visíveis para todos os membros</div>
        </div>
      </div>

      {/* Messages area */}
      <div style={{ flex: 1, overflowY: 'auto', padding: '16px 20px', display: 'flex', flexDirection: 'column', gap: '12px' }}>
        {loading ? (
          <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <span uk-spinner="ratio: 1.5"></span>
          </div>
        ) : messages.length === 0 ? (
          <div style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', color: 'var(--text-faint)', gap: '10px' }}>
            <span uk-icon="icon: commenting; ratio: 2.5" style={{ color: 'var(--border-strong)' }}></span>
            <p style={{ margin: 0, fontSize: '13px' }}>Nenhuma mensagem ainda. Seja o primeiro a conversar!</p>
          </div>
        ) : (
          messages.map((msg) => {
            const isOwn = user?.id === msg.user.id;
            return (
              <div key={msg.id}
                style={{ display: 'flex', gap: '10px', flexDirection: isOwn ? 'row-reverse' : 'row', alignItems: 'flex-end', animation: 'fadeInUp 0.2s ease' }}
              >
                <div style={{ flexShrink: 0 }}>
                  <Avatar name={msg.user.name} profileImage={msg.user.profileImage} size="small" />
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '3px', alignItems: isOwn ? 'flex-end' : 'flex-start', maxWidth: '65%' }}>
                  <div style={{ display: 'flex', alignItems: 'baseline', gap: '8px', flexDirection: isOwn ? 'row-reverse' : 'row' }}>
                    <span style={{ fontSize: '12px', fontWeight: 600, color: 'var(--text)' }}>{msg.user.name}</span>
                    <span style={{ fontSize: '11px', color: 'var(--text-faint)' }}>{formatDate(msg.createdAt)}</span>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'flex-end', gap: '6px', flexDirection: isOwn ? 'row-reverse' : 'row' }}>
                    <div style={{
                      padding: '9px 13px',
                      background: isOwn ? 'var(--accent)' : 'var(--bg-elevated)',
                      color: isOwn ? '#fff' : 'var(--text)',
                      border: isOwn ? '1px solid var(--accent)' : '1px solid var(--border)',
                      fontSize: '13px',
                      lineHeight: 1.5,
                      wordBreak: 'break-word',
                      maxWidth: '100%'
                    }}>
                      {msg.content}
                    </div>
                    {isOwn && (
                      <button
                        onClick={() => handleDelete(msg.id, msg.user.id)}
                        title="Deletar"
                        style={{
                          background: 'none', border: 'none', cursor: 'pointer',
                          color: 'var(--text-faint)', padding: '2px',
                          display: 'flex', alignItems: 'center',
                          opacity: 0, transition: 'opacity 160ms ease'
                        }}
                        onMouseEnter={(e) => { e.currentTarget.style.opacity = '1'; e.currentTarget.style.color = 'var(--danger)'; }}
                        onMouseLeave={(e) => { e.currentTarget.style.opacity = '0'; }}
                        className="msg-delete-btn"
                      >
                        <span uk-icon="icon: trash; ratio: 0.75"></span>
                      </button>
                    )}
                  </div>
                </div>
              </div>
            );
          })
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* Input area */}
      <form onSubmit={handleSend} style={{
        padding: '12px 16px',
        borderTop: '1px solid var(--border)',
        background: 'var(--bg)',
        display: 'flex',
        gap: '10px',
        alignItems: 'center',
        flexShrink: 0
      }}>
        <input
          type="text"
          placeholder="Digite sua mensagem..."
          value={newMessage}
          onChange={(e) => setNewMessage(e.target.value)}
          disabled={sending}
          maxLength={500}
          style={{
            flex: 1,
            height: '38px',
            padding: '0 14px',
            border: '1px solid var(--border-strong)',
            background: 'var(--bg-surface)',
            color: 'var(--text)',
            fontSize: '13px',
            fontFamily: 'inherit',
            outline: 'none',
            transition: 'border-color 160ms ease'
          }}
          onFocus={(e) => (e.target.style.borderColor = 'var(--accent)')}
          onBlur={(e) => (e.target.style.borderColor = 'var(--border-strong)')}
        />
        <button
          type="submit"
          disabled={sending || !newMessage.trim()}
          style={{
            height: '38px',
            padding: '0 18px',
            background: 'var(--accent)',
            color: '#fff',
            border: '1px solid var(--accent)',
            fontSize: '13px',
            fontFamily: 'inherit',
            fontWeight: 500,
            cursor: 'pointer',
            display: 'flex', alignItems: 'center', gap: '6px',
            transition: 'background 160ms ease, transform 160ms ease',
            opacity: sending || !newMessage.trim() ? 0.5 : 1
          }}
          onMouseEnter={(e) => { if (!sending && newMessage.trim()) { e.currentTarget.style.background = 'var(--accent-dark)'; e.currentTarget.style.transform = 'translateY(-1px)'; } }}
          onMouseLeave={(e) => { e.currentTarget.style.background = 'var(--accent)'; e.currentTarget.style.transform = 'translateY(0)'; }}
        >
          {sending
            ? <span uk-spinner="ratio: 0.5"></span>
            : <><span uk-icon="icon: arrow-right; ratio: 0.85"></span> Enviar</>
          }
        </button>
      </form>

      <style>{`
        @keyframes fadeInUp {
          from { opacity: 0; transform: translateY(6px); }
          to   { opacity: 1; transform: translateY(0); }
        }
        .msg-delete-btn { opacity: 0; }
        div:hover > div > .msg-delete-btn { opacity: 1; }
      `}</style>
    </div>
  );
};

export default Chat;
