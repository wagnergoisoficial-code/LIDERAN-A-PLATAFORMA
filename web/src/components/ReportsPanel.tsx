import React, { useState, useEffect, useCallback } from 'react';
import UIkit from 'uikit';
import { api } from '../services/api';
import Icon from './Icon';
import Modal from './Modal';

interface Person { id: string; name: string; role?: string; isMinor?: boolean }
interface ReportSummary {
  id: string;
  targetType: 'conversation' | 'community_chat' | 'post' | 'prayer_request' | 'video' | 'profile';
  status: 'open' | 'resolved' | 'dismissed';
  details?: string | null;
  createdAt: string;
  resolution?: string | null;
  reporter: Person | null;
  targetUser: (Person & { status?: string; suspendedUntil?: string | null }) | null;
}
interface SnapshotMessage { id: string; sender?: Person | null; content: string; createdAt: string; deletedAt?: string | null; hiddenAt?: string | null }
interface ReportDetail extends ReportSummary { snapshot: any }

const TYPE_LABELS: Record<string, string> = {
  conversation: 'Conversa privada',
  community_chat: 'Chat da comunidade',
  post: 'Publicação',
  prayer_request: 'Pedido de oração',
  video: 'Vídeo',
  profile: 'Perfil',
};
const STATUS_LABELS: Record<string, string> = { open: 'Aberta', resolved: 'Resolvida', dismissed: 'Arquivada' };
const SUSPENSION_DAYS = [1, 3, 7, 15, 30, 90];

const formatDateTime = (value: string) =>
  new Date(value).toLocaleString('pt-BR', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' });

const name = (p?: Person | null) =>
  p ? `${p.name}${p.isMinor ? ' (menor)' : p.role === 'guardian' ? ' (responsável)' : ''}` : 'Membro';

// Histórico de mensagens guardado na denúncia
const MessageHistory: React.FC<{ messages: SnapshotMessage[]; highlightId?: string | null }> = ({ messages, highlightId }) => (
  <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
    {messages.length === 0 && <p className="muted" style={{ fontSize: '14px' }}>Sem mensagens.</p>}
    {messages.map(m => (
      <div key={m.id} className={`history-msg${m.id === highlightId ? ' is-highlight' : ''}`}>
        <div className="history-msg-meta">
          <strong>{name(m.sender)}</strong> · {formatDateTime(m.createdAt)}
          {(m.deletedAt || m.hiddenAt) && ' · apagada ou ocultada depois'}
          {m.id === highlightId && ' · mensagem denunciada'}
        </div>
        <div className="history-msg-text">{m.content}</div>
      </div>
    ))}
  </div>
);

const Snapshot: React.FC<{ snapshot: any }> = ({ snapshot }) => {
  if (!snapshot) return null;
  if (snapshot.kind === 'conversation') {
    return (
      <>
        <div className="list-label" style={{ margin: 0 }}>Conversa entre {snapshot.participants.map((p: Person) => name(p)).join(' e ')}</div>
        <MessageHistory messages={snapshot.messages} />
      </>
    );
  }
  if (snapshot.kind === 'community_chat') {
    return (
      <>
        <div className="list-label" style={{ margin: 0 }}>Últimas mensagens do chat</div>
        <MessageHistory messages={snapshot.messages} highlightId={snapshot.reportedMessageId} />
      </>
    );
  }
  if (snapshot.kind === 'post') {
    return (
      <>
        <div className="list-label" style={{ margin: 0 }}>
          {snapshot.post.type === 'donation' ? `Doação de ${name(snapshot.post.author)} · buscar em ${snapshot.post.location}` : `Publicação de ${name(snapshot.post.author)}`}
        </div>
        <div className="history-msg" style={{ fontSize: '14px' }}>
          {snapshot.post.content || <span className="muted">Só imagem</span>}
          {snapshot.post.imageUrl && (
            <img src={snapshot.post.imageUrl} alt="" style={{ display: 'block', maxWidth: '100%', maxHeight: '220px', marginTop: '8px', borderRadius: 'var(--radius-sm)' }} />
          )}
        </div>
        {snapshot.comments.length > 0 && (
          <>
            <div className="list-label" style={{ margin: 0 }}>Comentários</div>
            <MessageHistory messages={snapshot.comments.map((c: any) => ({ ...c, sender: c.author }))} />
          </>
        )}
      </>
    );
  }
  if (snapshot.kind === 'video') {
    return (
      <>
        <div className="list-label" style={{ margin: 0 }}>Vídeo de {name(snapshot.video.author)}{snapshot.video.churchName ? ` · ${snapshot.video.churchName}` : ''}</div>
        <a href={`https://www.youtube.com/watch?v=${snapshot.video.sourceId}`} target="_blank" rel="noreferrer" className="video-thumb" style={{ maxWidth: '320px' }}>
          <img src={`https://i.ytimg.com/vi/${snapshot.video.sourceId}/hqdefault.jpg`} alt="" />
        </a>
        <div style={{ fontSize: '14px' }}>
          <strong style={{ color: 'var(--text)' }}>{snapshot.video.title}</strong>
          {snapshot.video.description && <div style={{ marginTop: '4px', color: 'var(--text-muted)' }}>{snapshot.video.description}</div>}
        </div>
      </>
    );
  }
  if (snapshot.kind === 'prayer_request') {
    return (
      <>
        <div className="list-label" style={{ margin: 0 }}>Pedido de oração de {name(snapshot.prayer.author)}</div>
        <div className="history-msg" style={{ fontSize: '14px' }}>
          <strong style={{ color: 'var(--text)' }}>{snapshot.prayer.title}</strong>
          <div style={{ marginTop: '4px', wordBreak: 'break-word' }}>{snapshot.prayer.content}</div>
        </div>
      </>
    );
  }
  // Perfil
  return (
    <>
      <div style={{ fontSize: '14px' }}>
        <strong style={{ color: 'var(--text)' }}>{name(snapshot.user)}</strong>
        {snapshot.user.title && <span style={{ color: 'var(--text-muted)' }}> · {snapshot.user.title}</span>}
      </div>
      <div className="list-label" style={{ margin: 0 }}>Conversa privada com quem denunciou</div>
      {snapshot.conversation
        ? <MessageHistory messages={snapshot.conversation.messages} />
        : <p className="muted" style={{ fontSize: '14px' }}>Não há conversa privada entre os dois.</p>}
      {snapshot.recentChatMessages.length > 0 && (
        <>
          <div className="list-label" style={{ margin: 0 }}>Mensagens recentes no chat da comunidade</div>
          <MessageHistory messages={snapshot.recentChatMessages.map((m: any) => ({ ...m, sender: snapshot.user }))} />
        </>
      )}
    </>
  );
};

// Painel do líder: denúncias da comunidade, com o histórico e as ações de moderação
const ReportsPanel: React.FC<{ churchId: string }> = ({ churchId }) => {
  const [reports, setReports] = useState<ReportSummary[]>([]);
  const [filter, setFilter] = useState<'open' | 'all'>('open');
  const [loading, setLoading] = useState(true);
  const [detail, setDetail] = useState<ReportDetail | null>(null);
  const [days, setDays] = useState(7);
  const [busy, setBusy] = useState(false);

  const load = useCallback(async () => {
    try {
      const res = await api.getReports(churchId, filter === 'open' ? 'open' : undefined);
      if (res.success) setReports(res.data);
    } catch { setReports([]); }
    finally { setLoading(false); }
  }, [churchId, filter]);

  useEffect(() => { setLoading(true); load(); }, [load]);

  const open = async (id: string) => {
    try {
      const res = await api.getReport(id);
      setDetail(res.data);
    } catch (err: any) {
      UIkit.notification({ message: err.message || 'Erro ao abrir a denúncia', status: 'danger', pos: 'top-right' });
    }
  };

  const act = async (action: () => Promise<any>, message: string) => {
    if (!detail) return;
    setBusy(true);
    try {
      await action();
      UIkit.notification({ message, status: 'success', pos: 'top-right' });
      const res = await api.getReport(detail.id);
      setDetail(res.data);
      load();
    } catch (err: any) {
      UIkit.notification({ message: err.message || 'Não foi possível concluir', status: 'danger', pos: 'top-right' });
    } finally {
      setBusy(false);
    }
  };

  const moderate = (action: 'suspend' | 'block') => {
    if (!detail?.targetUser) return;
    const who = detail.targetUser.name;
    if (!confirm(action === 'suspend' ? `Suspender ${who} por ${days} ${days === 1 ? 'dia' : 'dias'}?` : `Bloquear ${who}?`)) return;
    act(
      () => api.moderateMember(churchId, detail.targetUser!.id, { action, days: action === 'suspend' ? days : undefined, reportId: detail.id }),
      action === 'suspend' ? 'Membro suspenso' : 'Membro bloqueado'
    );
  };

  const setStatus = (status: 'resolved' | 'dismissed' | 'open') =>
    act(() => api.updateReport(detail!.id, { status }), status === 'open' ? 'Denúncia reaberta' : status === 'resolved' ? 'Denúncia resolvida' : 'Denúncia arquivada');

  const openCount = reports.filter(r => r.status === 'open').length;

  return (
    <section aria-labelledby="reports-title">
      <div className="section-head">
        <h2 id="reports-title" className="list-label">Denúncias{filter === 'open' && openCount > 0 ? ` · ${openCount} ${openCount === 1 ? 'aberta' : 'abertas'}` : ''}</h2>
        <div className="segmented" role="group" aria-label="Mostrar denúncias">
          {(['open', 'all'] as const).map(f => (
            <button key={f} type="button" aria-pressed={filter === f} onClick={() => setFilter(f)}>
              {f === 'open' ? 'Abertas' : 'Todas'}
            </button>
          ))}
        </div>
      </div>

      <div className="card">
        {loading ? (
          <div className="loading-block" style={{ padding: '24px' }}><span uk-spinner="ratio: 0.7"></span></div>
        ) : reports.length === 0 ? (
          <p className="list-empty">
            {filter === 'open' ? 'Nenhuma denúncia em aberto.' : 'Ainda não houve denúncias nesta comunidade.'}
          </p>
        ) : (
          reports.map(r => (
            <button key={r.id} type="button" className="conversation-item" onClick={() => open(r.id)}>
              <span className="group-avatar" style={{ width: 40, height: 40 }}><Icon name="flag" size={18} /></span>
              <span style={{ flex: 1, minWidth: 0 }}>
                <span className="conversation-name">
                  <span className="truncate">{TYPE_LABELS[r.targetType]}{r.targetUser ? ` · ${name(r.targetUser)}` : ''}</span>
                </span>
                <span className="conversation-preview" style={{ display: 'block' }}>
                  Enviada por {name(r.reporter)} · {formatDateTime(r.createdAt)}
                </span>
              </span>
              <span className="tag">{STATUS_LABELS[r.status]}</span>
            </button>
          ))
        )}
      </div>

      {detail && (
        <Modal title={`Denúncia: ${TYPE_LABELS[detail.targetType]}`} onClose={() => setDetail(null)} width={640}>
            <div className="protection-row" style={{ fontSize: '14px', color: 'var(--text-muted)' }}>
              <span className="tag">{STATUS_LABELS[detail.status]}</span>
              <span>Enviada por <strong style={{ color: 'var(--text)' }}>{name(detail.reporter)}</strong> em {formatDateTime(detail.createdAt)}</span>
            </div>
            {detail.details && <p style={{ margin: '10px 0 0', fontSize: '14px' }}>“{detail.details}”</p>}
            {detail.resolution && <p className="muted" style={{ margin: '10px 0 0', fontSize: '14px' }}>Resultado: {detail.resolution}</p>}

            <div className="protection-section" style={{ maxHeight: '46vh', overflowY: 'auto' }}>
              <Snapshot snapshot={detail.snapshot} />
            </div>

            <div className="protection-section">
              {detail.status === 'open' ? (
                <>
                  {detail.targetUser && (
                    <div className="protection-row">
                      <span className="muted" style={{ fontSize: '14px' }}>{name(detail.targetUser)}:</span>
                      <select className="uk-select" value={days} onChange={e => setDays(Number(e.target.value))} style={{ width: 'auto' }} aria-label="Duração da suspensão">
                        {SUSPENSION_DAYS.map(d => <option key={d} value={d}>{d} {d === 1 ? 'dia' : 'dias'}</option>)}
                      </select>
                      <button className="uk-button uk-button-danger uk-button-small" onClick={() => moderate('suspend')} disabled={busy}>Suspender</button>
                      <button className="uk-button uk-button-danger uk-button-small" onClick={() => moderate('block')} disabled={busy}>Bloquear</button>
                    </div>
                  )}
                  <div className="protection-row">
                    <button className="uk-button uk-button-success uk-button-small" onClick={() => setStatus('resolved')} disabled={busy}>
                      <Icon name="check" size={16} /> Marcar como resolvida
                    </button>
                    <button className="uk-button uk-button-default uk-button-small" onClick={() => setStatus('dismissed')} disabled={busy}>Arquivar sem ação</button>
                  </div>
                </>
              ) : (
                <div>
                  <button className="uk-button uk-button-default uk-button-small" onClick={() => setStatus('open')} disabled={busy}>Reabrir denúncia</button>
                </div>
              )}
            </div>
        </Modal>
      )}
    </section>
  );
};

export default ReportsPanel;
