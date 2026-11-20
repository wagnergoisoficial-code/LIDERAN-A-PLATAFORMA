import { useState, useEffect, useCallback } from 'react';
import UIkit from 'uikit';
import { api } from '../services/api';
import { plural, shortTime, fullDate } from '../lib/format';
import Avatar from '../components/Avatar';
import Icon from '../components/Icon';
import Modal from '../components/Modal';
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
      UIkit.notification({ message: err.message || 'Não foi possível carregar', status: 'danger', pos: 'top-right' });
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
      UIkit.notification({ message: err.message || 'Não foi possível autorizar', status: 'danger', pos: 'top-right' });
    } finally {
      setAuthorizing(null);
    }
  };

  const openConversation = async (child: Child, conversationId: string) => {
    try {
      const res = await api.getChildConversation(child.id, conversationId);
      setOpen({ child, thread: res.data });
    } catch (err: any) {
      UIkit.notification({ message: err.message || 'Não foi possível abrir a conversa', status: 'danger', pos: 'top-right' });
    }
  };

  return (
    <div className="page is-medium">
      <PageHeader title="Meus filhos" subtitle="As conversas privadas dos seus filhos na comunidade, só para leitura." />

      {loading ? (
        <div className="loading-block" role="status" aria-label="Carregando"><span uk-spinner="ratio: 1"></span></div>
      ) : children.length === 0 ? (
        <div className="card">
          <EmptyState icon="users" title="Nenhum filho vinculado a esta conta" text="O líder da comunidade vincula sua conta ao cadastro do seu filho." />
        </div>
      ) : (
        <div className="stagger" style={{ display: 'grid', gap: '16px' }}>
          {children.map(child => (
            <section key={child.id} className="card" aria-labelledby={`child-${child.id}`}>
              <div className="card-header">
                <span style={{ display: 'flex', alignItems: 'center', gap: '12px', minWidth: 0 }}>
                  <Avatar name={child.name} profileImage={child.profileImage} size={40} />
                  <span style={{ minWidth: 0 }}>
                    <h2 id={`child-${child.id}`} style={{ fontSize: '16px' }}>{child.name}</h2>
                    <span className="list-row-meta" style={{ display: 'block' }}>
                      {child.pendingAuthorization ? 'Aguarda sua autorização' : plural(child.conversations.length, 'conversa privada', 'conversas privadas')}
                    </span>
                  </span>
                </span>
                {child.pendingAuthorization && (
                  <button type="button" className="uk-button uk-button-success uk-button-small" onClick={() => authorize(child)} disabled={authorizing === child.id}>
                    <Icon name="check" size={16} /> Autorizar cadastro
                  </button>
                )}
              </div>

              {child.pendingAuthorization ? (
                <p className="list-empty">A conta de {child.name} só fica ativa depois da sua autorização.</p>
              ) : child.conversations.length === 0 ? (
                <p className="list-empty">{child.name} ainda não tem conversas privadas.</p>
              ) : (
                child.conversations.map(c => (
                  <button key={c.id} type="button" className="conversation-item" onClick={() => openConversation(child, c.id)}>
                    <Avatar name={c.with?.name || '?'} profileImage={c.with?.profileImage} size={40} />
                    <span style={{ flex: 1, minWidth: 0 }}>
                      <span className="conversation-name"><span className="truncate">Conversa com {c.with?.name || 'membro'}</span></span>
                      <span className="conversation-preview" style={{ display: 'block' }}>
                        {c.lastMessage ? `${c.lastMessage.fromChild ? `${child.name}: ` : ''}${c.lastMessage.content}` : 'Sem mensagens'}
                      </span>
                    </span>
                    <span className="faint" style={{ fontSize: '12px', flexShrink: 0 }}>{plural(c.messageCount, 'mensagem', 'mensagens')}</span>
                  </button>
                ))
              )}
            </section>
          ))}
        </div>
      )}

      {open && (
        <Modal title={open.thread.participants.map(p => p.name).join(' e ')} onClose={() => setOpen(null)} width={560}>
          <p className="protected-note" style={{ borderRadius: 'var(--radius)', marginBottom: '12px' }}>
            <Icon name="lock" size={16} /> Só leitura. As mensagens desta conversa não podem ser apagadas.
          </p>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', maxHeight: '55vh', overflowY: 'auto' }}>
            {open.thread.messages.length === 0 ? (
              <p className="muted">Sem mensagens.</p>
            ) : open.thread.messages.map(m => (
              <div key={m.id} className={`msg-row${m.fromChild ? ' is-own' : ''}`}>
                <div className="msg-stack">
                  <span className="msg-author">{m.sender.name}</span>
                  <div className="bubble" style={m.fromChild ? { background: 'var(--bg-elevated)', color: 'var(--text)' } : undefined}>{m.content}</div>
                  <time className="msg-time" dateTime={m.createdAt} title={fullDate(m.createdAt)}>{shortTime(m.createdAt)}</time>
                </div>
              </div>
            ))}
          </div>
          <div className="protection-row" style={{ justifyContent: 'space-between', marginTop: '16px', paddingTop: '16px', borderTop: '1px solid var(--border)' }}>
            <span className="muted" style={{ fontSize: '13px' }}>A denúncia envia esta conversa ao líder.</span>
            <ReportButton targetType="conversation" targetId={open.thread.id} />
          </div>
        </Modal>
      )}
    </div>
  );
};

export default GuardianHome;
