import React, { useState, useEffect, useCallback } from 'react';
import UIkit from 'uikit';
import { api } from '../services/api';
import Avatar from '../components/Avatar';
import PageHeader from '../components/PageHeader';
import EmptyState from '../components/EmptyState';
import ReportButton from '../components/ReportButton';

interface ChildConversation {
  id: string;
  with: { id: string; name: string; profileImage?: string | null } | null;
  lastMessage: { content: string; createdAt: string; fromChild: boolean } | null;
  messageCount: number;
  lastMessageAt: string;
}
interface Child {
  id: string;
  name: string;
  profileImage?: string | null;
  status: string;
  pendingAuthorization: boolean;
  authorizedAt?: string | null;
  conversations: ChildConversation[];
}
interface Thread {
  id: string;
  participants: { id: string; name: string; profileImage?: string | null }[];
  messages: { id: string; content: string; createdAt: string; fromChild: boolean; sender: { id: string; name: string } }[];
}

const formatDateTime = (value: string) =>
  new Date(value).toLocaleString('pt-BR', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' });

// Área do responsável: vê, sem poder escrever, as conversas privadas dos filhos menores
const GuardianHome = () => {
  const [children, setChildren] = useState<Child[]>([]);
  const [loading, setLoading] = useState(true);
  const [authorizing, setAuthorizing] = useState<string | null>(null);
  const [open, setOpen] = useState<{ child: Child; thread: Thread } | null>(null);

  const load = useCallback(async () => {
    try {
      const res = await api.getGuardianChildren();
      if (res.success) setChildren(res.data);
    } catch (err: any) {
      UIkit.notification({ message: err.message || 'Erro ao carregar', status: 'danger', pos: 'top-right' });
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  const authorize = async (child: Child) => {
    if (!confirm(`Autorizar o cadastro de ${child.name} na comunidade?`)) return;
    setAuthorizing(child.id);
    try {
      await api.authorizeChild(child.id);
      UIkit.notification({ message: `Cadastro de ${child.name} autorizado`, status: 'success', pos: 'top-right' });
      load();
    } catch (err: any) {
      UIkit.notification({ message: err.message || 'Erro ao autorizar', status: 'danger', pos: 'top-right' });
    } finally {
      setAuthorizing(null);
    }
  };

  const openConversation = async (child: Child, conversationId: string) => {
    try {
      const res = await api.getChildConversation(child.id, conversationId);
      setOpen({ child, thread: res.data });
    } catch (err: any) {
      UIkit.notification({ message: err.message || 'Erro ao abrir a conversa', status: 'danger', pos: 'top-right' });
    }
  };

  return (
    <div>
      <PageHeader
        icon="users"
        title="Meus filhos"
        subtitle="Conversas privadas dos seus filhos na comunidade, só para leitura"
      />

      {loading ? (
        <div style={{ padding: '60px', textAlign: 'center' }}><span uk-spinner="ratio: 1.2"></span></div>
      ) : children.length === 0 ? (
        <EmptyState icon="users" title="Nenhum filho vinculado a esta conta" text="O líder da comunidade vincula sua conta ao cadastro do seu filho." />
      ) : (
        <div className="stagger" style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          {children.map(child => (
            <div key={child.id} className="card">
              <div className="card-header">
                <span style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                  <Avatar name={child.name} profileImage={child.profileImage || undefined} size="small" />
                  <strong style={{ fontSize: '14px', color: 'var(--text)' }}>{child.name}</strong>
                  {child.pendingAuthorization && <span className="uk-label">Aguarda autorização</span>}
                </span>
                {child.pendingAuthorization && (
                  <button className="uk-button uk-button-success uk-button-small" onClick={() => authorize(child)} disabled={authorizing === child.id}>
                    <span uk-icon="icon: check; ratio: 0.75"></span> Autorizar cadastro
                  </button>
                )}
              </div>

              {child.pendingAuthorization ? (
                <p style={{ margin: 0, padding: '16px', fontSize: '13px', color: 'var(--text-muted)' }}>
                  A conta de {child.name} só fica ativa depois da sua autorização.
                </p>
              ) : child.conversations.length === 0 ? (
                <p style={{ margin: 0, padding: '16px', fontSize: '13px', color: 'var(--text-muted)' }}>
                  {child.name} ainda não tem conversas privadas.
                </p>
              ) : (
                child.conversations.map(c => (
                  <button key={c.id} type="button" className="conversation-item" onClick={() => openConversation(child, c.id)}>
                    <Avatar name={c.with?.name || '?'} profileImage={c.with?.profileImage || undefined} size="small" />
                    <span style={{ flex: 1, minWidth: 0 }}>
                      <span className="conversation-name">Conversa com {c.with?.name || 'membro'}</span>
                      <span className="conversation-preview" style={{ display: 'block' }}>
                        {c.lastMessage ? `${c.lastMessage.fromChild ? `${child.name}: ` : ''}${c.lastMessage.content}` : 'Sem mensagens'}
                      </span>
                    </span>
                    <span style={{ fontSize: '11px', color: 'var(--text-faint)', flexShrink: 0 }}>
                      {c.messageCount} {c.messageCount === 1 ? 'mensagem' : 'mensagens'}
                    </span>
                  </button>
                ))
              )}
            </div>
          ))}
        </div>
      )}

      {open && (
        <div className="modal-overlay" onClick={e => { if (e.target === e.currentTarget) setOpen(null); }}>
          <div className="modal-box" style={{ maxWidth: '560px' }}>
            <div className="modal-header">
              <h4>{open.thread.participants.map(p => p.name).join(' e ')}</h4>
              <button className="modal-close-btn" onClick={() => setOpen(null)} aria-label="Fechar">
                <span uk-icon="icon: close; ratio: 0.9"></span>
              </button>
            </div>
            <div className="protected-note" style={{ margin: '0 0 12px' }}>
              <span uk-icon="icon: lock; ratio: 0.7"></span>
              Só leitura. As mensagens desta conversa não podem ser apagadas.
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', maxHeight: '60vh', overflowY: 'auto' }}>
              {open.thread.messages.length === 0 ? (
                <p style={{ margin: 0, fontSize: '13px', color: 'var(--text-muted)' }}>Sem mensagens.</p>
              ) : open.thread.messages.map(m => (
                <div key={m.id} style={{ display: 'flex', flexDirection: 'column', alignItems: m.fromChild ? 'flex-end' : 'flex-start' }}>
                  <span style={{ fontSize: '11px', color: 'var(--text-faint)', marginBottom: '3px' }}>
                    {m.sender.name} · {formatDateTime(m.createdAt)}
                  </span>
                  <div style={{
                    maxWidth: '80%',
                    padding: '9px 13px',
                    borderRadius: 'var(--radius-lg)',
                    background: m.fromChild ? 'var(--bg-surface)' : 'var(--bg-elevated)',
                    color: 'var(--text)',
                    fontSize: '13px',
                    lineHeight: 1.5,
                    wordBreak: 'break-word',
                  }}>
                    {m.content}
                  </div>
                </div>
              ))}
            </div>
            <div className="protection-row" style={{ justifyContent: 'space-between', marginTop: '14px', paddingTop: '14px', borderTop: '1px solid var(--border)' }}>
              <span style={{ fontSize: '12px', color: 'var(--text-muted)' }}>A denúncia envia esta conversa ao líder.</span>
              <ReportButton targetType="conversation" targetId={open.thread.id} />
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default GuardianHome;
