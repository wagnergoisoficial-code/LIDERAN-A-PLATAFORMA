import React, { useEffect, useState } from 'react';
import UIkit from 'uikit';
import { api } from '../services/api';
import Icon from './Icon';
import Modal from './Modal';

interface Person { id: string; name: string; isMinor?: boolean }
interface ConversationSummary {
  id: string;
  participants: Person[];
  lastMessage: { content: string; createdAt: string } | null;
  messageCount: number;
  protected: boolean;
}
interface Thread {
  id: string;
  participants: Person[];
  protected: boolean;
  messages: { id: string; content: string; createdAt: string; sender: { id: string; name: string } }[];
}

const formatDateTime = (value: string) =>
  new Date(value).toLocaleString('pt-BR', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' });
const names = (people: Person[]) => people.map(p => `${p.name}${p.isMinor ? ' (menor)' : ''}`).join(' e ');

// Painel do líder: as conversas privadas da comunidade, só para ler
const CommunityConversations: React.FC<{ churchId: string }> = ({ churchId }) => {
  const [list, setList] = useState<ConversationSummary[]>([]);
  const [loading, setLoading] = useState(true);
  const [open, setOpen] = useState<Thread | null>(null);

  useEffect(() => {
    setLoading(true);
    api.getChurchConversations(churchId)
      .then(res => setList(res.data))
      .catch(() => setList([]))
      .finally(() => setLoading(false));
  }, [churchId]);

  const read = async (id: string) => {
    try {
      const res = await api.getChurchConversation(churchId, id);
      setOpen(res.data);
    } catch (err: any) {
      UIkit.notification({ message: err.message || 'Não foi possível abrir a conversa', status: 'danger', pos: 'top-right' });
    }
  };

  return (
    <section aria-labelledby="community-conversations">
      <h2 id="community-conversations" className="list-label">Conversas privadas{list.length ? ` · ${list.length}` : ''}</h2>
      <div className="card">
        {loading ? (
          <div className="loading-block" style={{ padding: '24px' }}><span uk-spinner="ratio: 0.7"></span></div>
        ) : list.length === 0 ? (
          <p className="list-empty">Ainda não há conversas privadas nesta comunidade.</p>
        ) : list.map(c => (
          <button key={c.id} type="button" className="conversation-item" onClick={() => read(c.id)}>
            <span className="group-avatar" style={{ width: 40, height: 40 }}><Icon name={c.protected ? 'lock' : 'messages'} size={18} /></span>
            <span style={{ flex: 1, minWidth: 0 }}>
              <span className="conversation-name"><span className="truncate">{names(c.participants)}</span></span>
              <span className="conversation-preview" style={{ display: 'block' }}>{c.lastMessage?.content}</span>
            </span>
            <span className="faint" style={{ fontSize: '12px', flexShrink: 0 }}>
              {c.messageCount} {c.messageCount === 1 ? 'mensagem' : 'mensagens'}
            </span>
          </button>
        ))}
      </div>

      {open && (
        <Modal title={names(open.participants)} onClose={() => setOpen(null)} width={560}>
          <p className="protected-note" style={{ marginBottom: '12px', borderRadius: 'var(--radius)' }}>
            <Icon name="lock" size={16} />
            {open.protected ? 'Só leitura. Conversa com menor de idade: nada pode ser apagado.' : 'Só leitura.'}
          </p>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', maxHeight: '60vh', overflowY: 'auto' }}>
            {open.messages.map(m => (
              <div key={m.id} className="history-msg">
                <div className="history-msg-meta"><strong>{m.sender.name}</strong> · {formatDateTime(m.createdAt)}</div>
                <div className="history-msg-text">{m.content}</div>
              </div>
            ))}
          </div>
        </Modal>
      )}
    </section>
  );
};

export default CommunityConversations;
