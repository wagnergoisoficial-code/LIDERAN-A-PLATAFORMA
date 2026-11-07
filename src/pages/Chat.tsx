import React, { useState, useEffect, useRef } from 'react';
import { Link } from 'react-router-dom';
import UIkit from 'uikit';
import { api } from '../services/api';
import { useAuth } from '../context/AuthContext';
import { useCommunity } from '../lib/community';
import { shortTime, fullDate, plural } from '../lib/format';
import Avatar from '../components/Avatar';
import Icon from '../components/Icon';
import PageHeader from '../components/PageHeader';
import ReportButton from '../components/ReportButton';

interface Message {
  id: string;
  content: string;
  user: { id: string; name: string; profileImage?: string };
  createdAt: string;
}

// Conversa de grupo da comunidade (como um grupo de mensagens): só entre os membros dela
const Chat = () => {
  const { user } = useAuth();
  const { community } = useCommunity();
  const [messages, setMessages] = useState<Message[]>([]);
  const [newMessage, setNewMessage] = useState('');
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const endRef = useRef<HTMLDivElement>(null);
  const lastId = useRef<string | null>(null);
  // Com menores na comunidade, as mensagens não podem ser apagadas
  const [isProtected, setIsProtected] = useState(false);
  const isLeader = user?.role === 'leader' || user?.role === 'admin';

  const loadMessages = async () => {
    try {
      const result = await api.getMessages(50);
      if (result.success) {
        setMessages(result.data);
        setIsProtected(!!result.protected);
      }
    } catch { /* tenta de novo no próximo ciclo */ }
    finally { setLoading(false); }
  };

  useEffect(() => {
    loadMessages();
    // Atualiza a cada 3 segundos, só com o separador visível (poupa o servidor)
    const timer = setInterval(() => { if (document.visibilityState === 'visible') loadMessages(); }, 3000);
    const onVisible = () => { if (document.visibilityState === 'visible') loadMessages(); };
    document.addEventListener('visibilitychange', onVisible);
    return () => {
      clearInterval(timer);
      document.removeEventListener('visibilitychange', onVisible);
    };
  }, []);

  // Desce até ao fim só quando chega uma mensagem nova (não a cada atualização)
  useEffect(() => {
    const last = messages[messages.length - 1]?.id || null;
    if (last && last !== lastId.current) endRef.current?.scrollIntoView({ block: 'end' });
    lastId.current = last;
  }, [messages]);

  const handleSend = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newMessage.trim()) return;
    setSending(true);
    try {
      const result = await api.sendMessage(newMessage.trim());
      if (result.success) {
        setNewMessage('');
        await loadMessages();
      } else {
        UIkit.notification({ message: result.message || 'A mensagem não foi enviada', status: 'danger', pos: 'top-right' });
      }
    } catch (err: any) {
      UIkit.notification({ message: err.message || 'A mensagem não foi enviada. Tente de novo.', status: 'danger', pos: 'top-right' });
    } finally {
      setSending(false);
    }
  };

  const handleDelete = async (messageId: string, messageUserId: string) => {
    if (user?.id !== messageUserId && !isLeader) return;
    if (user?.id !== messageUserId && !confirm('Ocultar esta mensagem de outro membro? Ela continua guardada para denúncias.')) return;
    try {
      const result = await api.deleteMessage(messageId);
      if (result.success) {
        setMessages(prev => prev.filter(m => m.id !== messageId));
        UIkit.notification({ message: user?.id === messageUserId ? 'Mensagem apagada' : 'Mensagem ocultada', status: 'success', pos: 'top-right' });
      }
    } catch (err: any) {
      UIkit.notification({ message: err.message || 'Não foi possível apagar', status: 'danger', pos: 'top-right' });
    }
  };

  return (
    <div className="page is-medium">
      <PageHeader
        title="Chat da comunidade"
        subtitle={isProtected
          ? 'Todos os membros veem estas mensagens. Há menores na comunidade: as mensagens não podem ser apagadas.'
          : 'Todos os membros da comunidade veem estas mensagens.'}
      />

      <div className="chat-panel">
        <div className="thread-head">
          <Link to="/messages" className="action-btn messages-back" aria-label="Voltar às mensagens"><Icon name="arrow-left" /></Link>
          <span className="group-avatar"><Icon name="users" /></span>
          <div className="thread-head-text">
            <span className="thread-title">{community?.name || 'Comunidade'}</span>
            <span className="thread-sub">{community ? plural(community.memberCount || 0, 'membro', 'membros') : 'Chat da comunidade'}</span>
          </div>
          {user?.churchId && <ReportButton targetType="community_chat" targetId={user.churchId} compact />}
        </div>

        {isProtected && (
          <div className="protected-note hide-wide">
            <Icon name="lock" size={16} />
            Há menores na comunidade: as mensagens não podem ser apagadas.
          </div>
        )}

        <div className="thread-body" aria-live="polite">
          {loading ? (
            <div className="loading-block" style={{ flex: 1 }}><span uk-spinner="ratio: 1"></span></div>
          ) : messages.length === 0 ? (
            <div className="messages-empty">
              <Icon name="chat" size={36} strokeWidth={1.5} className="faint" />
              <p>Ainda não há mensagens. Comece a conversa!</p>
            </div>
          ) : (
            messages.map((msg, i) => {
              const isOwn = user?.id === msg.user.id;
              // Mensagens seguidas da mesma pessoa: o nome e a foto aparecem só na primeira
              const first = messages[i - 1]?.user.id !== msg.user.id;
              const canDelete = (isOwn && !isProtected) || (!isOwn && isLeader);
              return (
                <div key={msg.id} className={`msg-row msg-in${isOwn ? ' is-own' : ''}`} style={{ marginTop: first && i > 0 ? '8px' : undefined }}>
                  {!isOwn && (first
                    ? <Link to={`/profile/${msg.user.id}`} tabIndex={-1} aria-hidden="true"><Avatar name={msg.user.name} profileImage={msg.user.profileImage} size={32} /></Link>
                    : <span style={{ width: 32, flexShrink: 0 }} />)}
                  <div className="msg-stack">
                    {!isOwn && first && <span className="msg-author">{msg.user.name}</span>}
                    <div className="bubble">{msg.content}</div>
                    <time className="msg-time" dateTime={msg.createdAt} title={fullDate(msg.createdAt)}>{shortTime(msg.createdAt)}</time>
                  </div>
                  {canDelete && (
                    <button type="button" className="action-btn msg-delete" onClick={() => handleDelete(msg.id, msg.user.id)}
                      aria-label={isOwn ? 'Apagar mensagem' : `Ocultar a mensagem de ${msg.user.name}`} title={isOwn ? 'Apagar mensagem' : 'Ocultar mensagem'}>
                      <Icon name="trash" size={16} />
                    </button>
                  )}
                </div>
              );
            })
          )}
          <div ref={endRef} />
        </div>

        <form className="thread-composer" onSubmit={handleSend}>
          <label className="visually-hidden" htmlFor="chat-text">Mensagem para a comunidade</label>
          <input id="chat-text" type="text" placeholder="Escreva para a comunidade" value={newMessage}
            onChange={e => setNewMessage(e.target.value)} maxLength={500} autoComplete="off" />
          <button type="submit" className="send-btn" aria-label="Enviar mensagem" disabled={sending || !newMessage.trim()}>
            {sending ? <span uk-spinner="ratio: 0.5"></span> : <Icon name="send" size={18} />}
          </button>
        </form>
      </div>
    </div>
  );
};

export default Chat;
