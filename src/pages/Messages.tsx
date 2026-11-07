import React, { useState, useEffect, useRef, useCallback } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import UIkit from 'uikit';
import { api } from '../services/api';
import { useAuth } from '../context/AuthContext';
import { useCommunity } from '../lib/community';
import { shortTime, fullDate } from '../lib/format';
import Avatar from '../components/Avatar';
import Icon from '../components/Icon';
import Modal from '../components/Modal';
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

const Messages = () => {
  const { user } = useAuth();
  const { community } = useCommunity();
  const [params, setParams] = useSearchParams();
  const activeId = params.get('c');

  const [conversations, setConversations] = useState<ConversationItem[]>([]);
  const [loadingList, setLoadingList] = useState(true);
  const [filter, setFilter] = useState('');
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
    } catch { /* a lista mantém-se */ }
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

  useEffect(() => { endRef.current?.scrollIntoView({ block: 'end' }); }, [messages]);

  const send = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!activeId || !text.trim()) return;
    setSending(true);
    try {
      const res = await api.sendDirectMessage(activeId, text.trim());
      setMessages(prev => [...prev, res.data]);
      lastAt.current = res.data.createdAt;
      // O texto só sai do campo depois de a mensagem ser enviada
      setText('');
      loadList();
    } catch (err: any) {
      UIkit.notification({ message: err.message || 'A mensagem não foi enviada. Tente de novo.', status: 'danger', pos: 'top-right' });
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
      UIkit.notification({ message: err.message || 'Não foi possível apagar', status: 'danger', pos: 'top-right' });
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
  const filteredConversations = conversations.filter(c => (c.with?.name || 'Membro').toLowerCase().includes(filter.trim().toLowerCase()));

  return (
    <div>
      <PageHeader
        title="Mensagens"
        subtitle="Conversas privadas com pessoas da sua comunidade. Os líderes da comunidade podem lê-las."
        actions={(
          <button type="button" className="uk-button uk-button-primary" onClick={openPicker}>
            <Icon name="plus" size={18} /> Nova conversa
          </button>
        )}
      />

      <div className={`messages${activeId ? ' has-active' : ''}`}>
        {/* Lista de conversas */}
        <div className="messages-list">
          <div className="messages-list-head">
            <label className="visually-hidden" htmlFor="conversation-filter">Buscar conversa</label>
            <input id="conversation-filter" className="form-input" type="search" placeholder="Buscar conversa" value={filter} onChange={e => setFilter(e.target.value)}
              style={{ height: '40px', borderRadius: '20px' }} />
          </div>
          <div className="messages-scroll">
            {community && !filter && (
              <Link to="/chat" className="conversation-item">
                <span className="group-avatar"><Icon name="users" /></span>
                <span style={{ flex: 1, minWidth: 0 }}>
                  <span className="conversation-name"><span className="truncate">Chat da comunidade</span></span>
                  <span className="conversation-preview" style={{ display: 'block' }}>Grupo com todos de {community.name}</span>
                </span>
              </Link>
            )}
            {loadingList ? (
              <div className="loading-block" role="status" aria-label="Carregando conversas"><span uk-spinner="ratio: 0.8"></span></div>
            ) : filteredConversations.length === 0 ? (
              <p className="list-empty">
                {filter ? 'Nenhuma conversa com esse nome.' : 'Ainda não tem conversas privadas. Toque em “Nova conversa” para falar com alguém da comunidade.'}
              </p>
            ) : (
              filteredConversations.map(c => (
                <button key={c.id} type="button" className={`conversation-item${c.id === activeId ? ' is-active' : ''}`}
                  aria-current={c.id === activeId ? 'true' : undefined} onClick={() => setParams({ c: c.id })}>
                  <Avatar name={c.with?.name || '?'} profileImage={c.with?.profileImage} size={44} />
                  <span style={{ flex: 1, minWidth: 0 }}>
                    <span className="conversation-name">
                      <span className="truncate">{c.with?.name || 'Membro'}</span>
                      {c.protected && <Icon name="lock" size={14} className="faint" />}
                    </span>
                    <span className="conversation-preview" style={{ display: 'block', fontWeight: c.unread && c.id !== activeId ? 600 : undefined, color: c.unread && c.id !== activeId ? 'var(--text)' : undefined }}>
                      {c.lastMessage ? `${c.lastMessage.fromMe ? 'Você: ' : ''}${c.lastMessage.content}` : 'Sem mensagens'}
                    </span>
                  </span>
                  <span style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: '4px', flexShrink: 0 }}>
                    <span className="faint" style={{ fontSize: '12px' }}>{shortTime(c.lastMessageAt)}</span>
                    {!!c.unread && c.id !== activeId && <span className="unread-badge" aria-label={`${c.unread} não lidas`}>{c.unread > 9 ? '9+' : c.unread}</span>}
                  </span>
                </button>
              ))
            )}
          </div>
        </div>

        {/* Conversa aberta */}
        <div className="messages-thread">
          {!activeId ? (
            <div className="messages-empty">
              <Icon name="messages" size={36} strokeWidth={1.5} className="faint" />
              <p>Escolha uma conversa ou comece uma nova.</p>
            </div>
          ) : (
            <>
              <div className="thread-head">
                <button type="button" className="action-btn messages-back" aria-label="Voltar às conversas" onClick={() => setParams({})}>
                  <Icon name="arrow-left" />
                </button>
                {active?.with && <Avatar name={active.with.name} profileImage={active.with.profileImage} size={40} />}
                <div className="thread-head-text">
                  {active?.with ? (
                    <Link to={`/profile/${active.with.id}`} className="thread-title">{active.with.name}</Link>
                  ) : <span className="thread-title">{loadingThread ? 'Carregando…' : 'Conversa'}</span>}
                  {active?.with?.title && <span className="thread-sub">{active.with.title}</span>}
                </div>
                <ReportButton targetType="conversation" targetId={activeId} compact />
              </div>

              {active?.protected && (
                <div className="protected-note">
                  <Icon name="lock" size={16} />
                  Conversa com menor de idade: as mensagens não podem ser apagadas e o responsável pode lê-las.
                </div>
              )}

              <div className="thread-body" aria-live="polite">
                {loadingThread ? (
                  <div className="loading-block" style={{ flex: 1 }}><span uk-spinner="ratio: 1"></span></div>
                ) : messages.length === 0 ? (
                  <p style={{ margin: 'auto', color: 'var(--text-muted)', fontSize: '14px' }}>Diga olá para {active?.with?.name || 'este membro'}.</p>
                ) : (
                  messages.map(m => (
                    <div key={m.id} className={`msg-row msg-in${m.fromMe ? ' is-own' : ''}`}>
                      <div className="msg-stack">
                        <div className="bubble">{m.content}</div>
                        <time className="msg-time" dateTime={m.createdAt} title={fullDate(m.createdAt)}>{shortTime(m.createdAt)}</time>
                      </div>
                      {m.fromMe && !active?.protected && (
                        <button type="button" className="action-btn msg-delete" aria-label="Apagar mensagem" title="Apagar mensagem" onClick={() => remove(m.id)}>
                          <Icon name="trash" size={16} />
                        </button>
                      )}
                    </div>
                  ))
                )}
                <div ref={endRef} />
              </div>

              <form className="thread-composer" onSubmit={send}>
                <label className="visually-hidden" htmlFor="dm-text">Mensagem</label>
                <input id="dm-text" type="text" placeholder="Escreva uma mensagem" value={text}
                  onChange={e => setText(e.target.value)} maxLength={2000} autoComplete="off" />
                <button type="submit" className="send-btn" aria-label="Enviar mensagem" disabled={sending || !text.trim()}>
                  {sending ? <span uk-spinner="ratio: 0.5"></span> : <Icon name="send" size={18} />}
                </button>
              </form>
            </>
          )}
        </div>
      </div>

      {/* Escolher com quem conversar */}
      {picker && (
        <Modal title="Nova conversa" onClose={() => setPicker(false)} width={440}>
          <label className="visually-hidden" htmlFor="picker-search">Buscar pessoa</label>
          <input id="picker-search" className="form-input" type="search" placeholder="Buscar pessoa" value={query} onChange={e => setQuery(e.target.value)} data-autofocus />
          <div style={{ margin: '12px -24px 0', maxHeight: '50vh', overflowY: 'auto' }}>
            {members === null ? (
              <div className="loading-block"><span uk-spinner="ratio: 0.8"></span></div>
            ) : filteredMembers.length === 0 ? (
              <p className="list-empty" style={{ textAlign: 'center' }}>Ninguém encontrado.</p>
            ) : (
              filteredMembers.map(m => (
                <button key={m.id} type="button" className="conversation-item" style={{ paddingLeft: '24px', paddingRight: '24px' }} onClick={() => startWith(m.id)}>
                  <Avatar name={m.name} profileImage={m.profileImage} size={40} />
                  <span style={{ flex: 1, minWidth: 0 }}>
                    <span className="conversation-name"><span className="truncate">{m.name}</span></span>
                    {m.title && <span className="conversation-preview" style={{ display: 'block' }}>{m.title}</span>}
                  </span>
                </button>
              ))
            )}
          </div>
        </Modal>
      )}
    </div>
  );
};

export default Messages;
