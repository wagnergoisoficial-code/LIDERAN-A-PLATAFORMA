import React, { useEffect, useState } from 'react';
import UIkit from 'uikit';
import { api } from '../services/api';

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
    <div>
      <div className="section-head">
        <span className="list-label">Conversas privadas{list.length ? ` · ${list.length}` : ''}</span>
      </div>
      <div className="card">
        {loading ? (
          <div style={{ padding: '20px', textAlign: 'center' }}><span uk-spinner="ratio: 0.7"></span></div>
        ) : list.length === 0 ? (
          <p style={{ margin: 0, padding: '16px', fontSize: '13px', color: 'var(--text-muted)' }}>Ainda não há conversas privadas nesta comunidade.</p>
        ) : list.map(c => (
          <button key={c.id} type="button" className="conversation-item" onClick={() => read(c.id)}>
            <span uk-icon={`icon: ${c.protected ? 'lock' : 'mail'}; ratio: 0.8`}></span>
            <span style={{ flex: 1, minWidth: 0 }}>
              <span className="conversation-name">{names(c.participants)}</span>
              <span className="conversation-preview" style={{ display: 'block' }}>{c.lastMessage?.content}</span>
            </span>
            <span style={{ fontSize: '11px', color: 'var(--text-faint)', flexShrink: 0 }}>
              {c.messageCount} {c.messageCount === 1 ? 'mensagem' : 'mensagens'}
            </span>
          </button>
        ))}
      </div>

      {open && (
        <div className="modal-overlay" onClick={e => { if (e.target === e.currentTarget) setOpen(null); }}>
          <div className="modal-box" style={{ maxWidth: '560px' }}>
            <div className="modal-header">
              <h4>{names(open.participants)}</h4>
              <button className="modal-close-btn" onClick={() => setOpen(null)} aria-label="Fechar">
                <span uk-icon="icon: close; ratio: 0.9"></span>
              </button>
            </div>
            <div className="protected-note" style={{ margin: '0 0 12px' }}>
              <span uk-icon="icon: lock; ratio: 0.7"></span>
              {open.protected ? 'Só leitura. Conversa com menor de idade: nada pode ser apagado.' : 'Só leitura.'}
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', maxHeight: '60vh', overflowY: 'auto' }}>
              {open.messages.map(m => (
                <div key={m.id} style={{ padding: '8px 10px', borderRadius: 'var(--radius-sm)', background: 'var(--bg-surface)' }}>
                  <div style={{ fontSize: '11px', color: 'var(--text-faint)', marginBottom: '2px' }}>
                    <strong style={{ color: 'var(--text-muted)' }}>{m.sender.name}</strong> · {formatDateTime(m.createdAt)}
                  </div>
                  <div style={{ fontSize: '13px', color: 'var(--text)', wordBreak: 'break-word' }}>{m.content}</div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default CommunityConversations;
