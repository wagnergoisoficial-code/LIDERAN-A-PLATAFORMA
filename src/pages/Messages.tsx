import React, { useState, useEffect, useRef, useCallback } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import UIkit from 'uikit';
import { api } from '../services/api';
import { useAuth } from '../context/AuthContext';
import Avatar from '../components/Avatar';
import PageHeader from '../components/PageHeader';
import ReportButton from '../components/ReportButton';

interface Person { id: string; name: string; profileImage?: string | null; role?: string; isMinor?: boolean; title?: string | null }
interface ConversationItem {
  id: string;
  with: Person | null;
  lastMessage: { content: string; createdAt: string; fromMe: boolean } | null;
  lastMessageAt: string;
  protected: boolean;
  unread?: number;
}
interface DirectMessage { id: string; content: string; createdAt: string; sender: Person; fromMe: boolean }

const formatTime = (value: string) => {
  const date = new Date(value);
  return date.toDateString() === new Date().toDateString()
    ? date.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })
    : date.toLocaleDateString('pt-BR', { day: 'numeric', month: 'short' });
};

const Messages = () => {
  const { user } = useAuth();
  const [params, setParams] = useSearchParams();
  const activeId = params.get('c');

  const [conversations, setConversations] = useState<ConversationItem[]>([]);
  const [loadingList, setLoadingList] = useState(true);
  const [active, setActive] = useState<ConversationItem | null>(null);
  const [messages, setMessages] = useState<DirectMessage[]>([]);
  const [loadingThread, setLoadingThread] = useState(false);
  const [text, setText] = useState('');
  const [sending, setSending] = useState(false);
  const [picker, setPicker] = useState(false);
  const [members, setMembers] = useState<Person[] | null>(null);
  const [query, setQuery] = useState('');
  const endRef = useRef<HTMLDivElement>(null);
  const lastAt = useRef<string | null>(null);

  const loadList = useCallback(async () => {
    try {
      const res = await api.getConversations();
      if (res.success) setConversations(res.data);
    } catch { /* lista mantém-se */ }
    finally { setLoadingList(false); }
  }, []);

  useEffect(() => {
    loadList();
    const timer = setInterval(() => { if (document.visibilityState === 'visible') loadList(); }, 15000);
    return () => clearInterval(timer);
  }, [loadList]);

  // Abre a conversa escolhida e marca-a como lida
  useEffect(() => {
    if (!activeId) {
      setActive(null);
      setMessages([]);
      return;
    }
    let cancelled = false;
    setLoadingThread(true);
    api.getConversationMessages(activeId)
      .then(res => {
        if (cancelled) return;
        setActive(res.data.conversation);
        setMessages(res.data.messages);
        lastAt.current = res.data.messages.length ? res.data.messages[res.data.messages.length - 1].createdAt : null;
        api.markConversationRead(activeId).then(loadList).catch(() => {});
      })
      .catch((err: any) => {
        if (cancelled) return;
        UIkit.notification({ message: err.message || 'Conversa não encontrada', status: 'danger', pos: 'top-right' });
        setParams({});
      })
      .finally(() => { if (!cancelled) setLoadingThread(false); });
    return () => { cancelled = true; };
  }, [activeId, loadList, setParams]);

  // Mensagens novas na conversa aberta (a cada 3 s, com o separador visível)
  useEffect(() => {
    if (!activeId) return;
    const timer = setInterval(async () => {
      if (document.visibilityState !== 'visible') return;
      try {
        const res = await api.getConversationMessages(activeId, lastAt.current || undefined);
        const fresh: DirectMessage[] = res.data.messages;
        if (!fresh.length) return;
        setMessages(prev => [...prev, ...fresh.filter(m => !prev.some(p => p.id === m.id))]);
        lastAt.current = fresh[fresh.length - 1].createdAt;
        api.markConversationRead(activeId).catch(() => {});
      } catch { /* tenta de novo no próximo ciclo */ }
    }, 3000);
    return () => clearInterval(timer);
  }, [activeId]);

  useEffect(() => { endRef.current?.scrollIntoView({ behavior: 'smooth' }); }, [messages]);

  const send = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!activeId || !text.trim()) return;
    setSending(true);
    try {
      const res = await api.sendDirectMessage(activeId, text.trim());
      setMessages(prev => [...prev, res.data]);
      lastAt.current = res.data.createdAt;
      setText('');
      loadList();
    } catch (err: any) {
      UIkit.notification({ message: err.message || 'Erro ao enviar', status: 'danger', pos: 'top-right' });
    } finally {
      setSending(false);
    }
  };

  const remove = async (messageId: string) => {
    if (!activeId || !confirm('Apagar esta mensagem? A outra pessoa também deixa de a ver.')) return;
    try {
      await api.deleteDirectMessage(activeId, messageId);
      setMessages(prev => prev.filter(m => m.id !== messageId));
      loadList();
    } catch (err: any) {
      UIkit.notification({ message: err.message || 'Erro ao apagar', status: 'danger', pos: 'top-right' });
    }
  };

  const openPicker = async () => {
    setPicker(true);
    setQuery('');
    if (members) return;
    try {
      const res = await api.getUsers();
      setMembers((res.data || []).filter((m: Person) => m.id !== user?.id));
    } catch {
      setMembers([]);
    }
  };

  const startWith = async (memberId: string) => {
    try {
      const res = await api.startConversation(memberId);
      setPicker(false);
      setParams({ c: res.data.id });
      loadList();
    } catch (err: any) {
      UIkit.notification({ message: err.message || 'Não foi possível abrir a conversa', status: 'danger', pos: 'top-right' });
    }
  };

  const filteredMembers = (members || []).filter(m => m.name.toLowerCase().includes(query.trim().toLowerCase()));

  return (
    <div className="chat-page">
      <PageHeader
        icon="mail"
        title="Mensagens"
        subtitle="Conversas privadas com membros da comunidade"
        actions={(
          <button className="uk-button uk-button-primary" onClick={openPicker}>
            <span uk-icon="icon: plus; ratio: 0.8"></span> Nova conversa
          </button>
        )}
      />

      <div className={`messages-layout${activeId ? ' has-active' : ''}`}>
        {/* Lista de conversas */}
        <div className="card messages-list">
          <div className="messages-scroll">
            {loadingList ? (
              <div style={{ padding: '32px', textAlign: 'center' }}><span uk-spinner="ratio: 0.8"></span></div>
            ) : conversations.length === 0 ? (
              <div style={{ padding: '32px 20px', textAlign: 'center', color: 'var(--text-muted)', fontSize: '13px' }}>
                Ainda não tem conversas. Toque em “Nova conversa” para falar com alguém da comunidade.
              </div>
            ) : (
              conversations.map(c => (
                <button key={c.id} type="button" className={`conversation-item${c.id === activeId ? ' is-active' : ''}`} onClick={() => setParams({ c: c.id })}>
                  <Avatar name={c.with?.name || '?'} profileImage={c.with?.profileImage || undefined} size="small" />
                  <span style={{ flex: 1, minWidth: 0 }}>
                    <span className="conversation-name">
                      <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{c.with?.name || 'Membro'}</span>
                      {c.protected && <span uk-icon="icon: lock; ratio: 0.6" title="Conversa protegida"></span>}
                    </span>
                    <span className="conversation-preview" style={{ display: 'block' }}>
                      {c.lastMessage ? `${c.lastMessage.fromMe ? 'Você: ' : ''}${c.lastMessage.content}` : 'Sem mensagens'}
                    </span>
                  </span>
                  <span style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: '4px', flexShrink: 0 }}>
                    <span style={{ fontSize: '11px', color: 'var(--text-faint)' }}>{formatTime(c.lastMessageAt)}</span>
                    {!!c.unread && c.id !== activeId && <span className="unread-badge">{c.unread > 9 ? '9+' : c.unread}</span>}
                  </span>
                </button>
              ))
            )}
          </div>
        </div>

        {/* Conversa aberta */}
        <div className="card messages-thread">
          {!activeId ? (
            <div style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: '10px', color: 'var(--text-faint)', padding: '24px', textAlign: 'center' }}>
              <span uk-icon="icon: mail; ratio: 2.2" style={{ color: 'var(--border-strong)' }}></span>
              <p style={{ margin: 0, fontSize: '13px' }}>Escolha uma conversa ou comece uma nova.</p>
            </div>
          ) : (
            <>
              <div className="card-header">
                <span style={{ display: 'flex', alignItems: 'center', gap: '10px', minWidth: 0 }}>
                  <button type="button" className="action-btn messages-back" title="Voltar às conversas" onClick={() => setParams({})}>
                    <span uk-icon="icon: chevron-left; ratio: 0.9"></span>
                  </button>
                  {active?.with && (
                    <>
                      <Avatar name={active.with.name} profileImage={active.with.profileImage || undefined} size="small" />
                      <Link to={`/profile/${active.with.id}`} style={{ color: 'var(--text)', fontWeight: 600, fontSize: '14px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                        {active.with.name}
                      </Link>
                    </>
                  )}
                </span>
                {activeId && <ReportButton targetType="conversation" targetId={activeId} compact />}
              </div>

              {active?.protected && (
                <div className="protected-note">
                  <span uk-icon="icon: lock; ratio: 0.7"></span>
                  Conversa com menor de idade: as mensagens não podem ser apagadas e o responsável pode lê-las.
                </div>
              )}

              <div style={{ flex: 1, overflowY: 'auto', padding: '16px 20px', display: 'flex', flexDirection: 'column', gap: '10px' }}>
                {loadingThread ? (
                  <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center' }}><span uk-spinner="ratio: 1"></span></div>
                ) : messages.length === 0 ? (
                  <p style={{ margin: 'auto', fontSize: '13px', color: 'var(--text-faint)' }}>Diga olá a {active?.with?.name || 'este membro'}.</p>
                ) : (
                  messages.map(m => (
                    <div key={m.id} className={`msg-in dm-row${m.fromMe ? ' is-own' : ''}`}
                      style={{ display: 'flex', alignItems: 'flex-end', gap: '6px', flexDirection: m.fromMe ? 'row-reverse' : 'row' }}>
                      <div style={{ display: 'flex', flexDirection: 'column', alignItems: m.fromMe ? 'flex-end' : 'flex-start', maxWidth: '70%' }}>
                        <div style={{
                          padding: '9px 13px',
                          borderRadius: 'var(--radius-lg)',
                          background: m.fromMe ? 'var(--accent)' : 'var(--bg-elevated)',
                          color: m.fromMe ? '#fff' : 'var(--text)',
                          fontSize: '13px',
                          lineHeight: 1.5,
                          wordBreak: 'break-word',
                        }}>
                          {m.content}
                        </div>
                        <span style={{ fontSize: '11px', color: 'var(--text-faint)', marginTop: '3px' }}>{formatTime(m.createdAt)}</span>
                      </div>
                      {m.fromMe && !active?.protected && (
                        <button type="button" className="action-btn dm-delete" title="Apagar mensagem" onClick={() => remove(m.id)}>
                          <span uk-icon="icon: trash; ratio: 0.7"></span>
                        </button>
                      )}
                    </div>
                  ))
                )}
                <div ref={endRef} />
              </div>

              <form onSubmit={send} style={{ padding: '12px 16px', borderTop: '1px solid var(--border)', display: 'flex', gap: '10px', alignItems: 'center', flexShrink: 0 }}>
                <input
                  type="text"
                  className="uk-input"
                  placeholder="Escreva uma mensagem..."
                  value={text}
                  onChange={e => setText(e.target.value)}
                  disabled={sending}
                  maxLength={2000}
                  style={{ flex: 1 }}
                />
                <button type="submit" className="uk-button uk-button-primary" disabled={sending || !text.trim()}>
                  {sending ? <span uk-spinner="ratio: 0.5"></span> : <><span uk-icon="icon: arrow-right; ratio: 0.85"></span> Enviar</>}
                </button>
              </form>
            </>
          )}
        </div>
      </div>

      {/* Escolher com quem conversar */}
      {picker && (
        <div className="modal-overlay" onClick={e => { if (e.target === e.currentTarget) setPicker(false); }}>
          <div className="modal-box" style={{ maxWidth: '440px' }}>
            <div className="modal-header">
              <h4>Nova conversa</h4>
              <button className="modal-close-btn" onClick={() => setPicker(false)} aria-label="Fechar">
                <span uk-icon="icon: close; ratio: 0.9"></span>
              </button>
            </div>
            <input className="uk-input" placeholder="Procurar membro" value={query} onChange={e => setQuery(e.target.value)} autoFocus />
            <div style={{ marginTop: '12px', maxHeight: '360px', overflowY: 'auto' }}>
              {members === null ? (
                <div style={{ padding: '24px', textAlign: 'center' }}><span uk-spinner="ratio: 0.8"></span></div>
              ) : filteredMembers.length === 0 ? (
                <p style={{ margin: '16px 0', fontSize: '13px', color: 'var(--text-muted)', textAlign: 'center' }}>Nenhum membro encontrado.</p>
              ) : (
                filteredMembers.map(m => (
                  <button key={m.id} type="button" className="conversation-item" onClick={() => startWith(m.id)}>
                    <Avatar name={m.name} profileImage={m.profileImage || undefined} size="small" />
                    <span style={{ flex: 1, minWidth: 0 }}>
                      <span className="conversation-name">{m.name}</span>
                      {m.title && <span className="conversation-preview" style={{ display: 'block' }}>{m.title}</span>}
                    </span>
                  </button>
                ))
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Messages;
