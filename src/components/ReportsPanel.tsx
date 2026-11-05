import React, { useState, useEffect, useCallback } from 'react';
import UIkit from 'uikit';
import { api } from '../services/api';

interface Person { id: string; name: string; role?: string; isMinor?: boolean }
interface ReportSummary {
  id: string;
  targetType: 'conversation' | 'community_chat' | 'post' | 'prayer_request' | 'profile';
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
    {messages.length === 0 && <p style={{ margin: 0, fontSize: '13px', color: 'var(--text-muted)' }}>Sem mensagens.</p>}
    {messages.map(m => (
      <div key={m.id} style={{
        padding: '8px 10px',
        borderRadius: 'var(--radius-sm)',
        background: m.id === highlightId ? 'var(--bg-elevated)' : 'var(--bg-surface)',
      }}>
        <div style={{ fontSize: '11px', color: 'var(--text-faint)', marginBottom: '2px' }}>
          <strong style={{ color: 'var(--text-muted)' }}>{name(m.sender)}</strong> · {formatDateTime(m.createdAt)}
          {(m.deletedAt || m.hiddenAt) && ' · apagada/ocultada depois'}
          {m.id === highlightId && ' · mensagem denunciada'}
        </div>
        <div style={{ fontSize: '13px', color: 'var(--text)', wordBreak: 'break-word' }}>{m.content}</div>
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
        <div className="list-label" style={{ margin: 0 }}>Publicação de {name(snapshot.post.author)}</div>
        <div style={{ padding: '10px 12px', borderRadius: 'var(--radius-sm)', background: 'var(--bg-surface)', fontSize: '13px' }}>
          {snapshot.post.content || <em style={{ color: 'var(--text-muted)' }}>Só imagem</em>}
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
  if (snapshot.kind === 'prayer_request') {
    return (
      <>
        <div className="list-label" style={{ margin: 0 }}>Pedido de oração de {name(snapshot.prayer.author)}</div>
        <div style={{ padding: '10px 12px', borderRadius: 'var(--radius-sm)', background: 'var(--bg-surface)', fontSize: '13px' }}>
          <strong style={{ color: 'var(--text)' }}>{snapshot.prayer.title}</strong>
          <div style={{ marginTop: '4px', wordBreak: 'break-word' }}>{snapshot.prayer.content}</div>
        </div>
      </>
    );
  }
  // Perfil
  return (
    <>
      <div style={{ fontSize: '13px' }}>
        <strong style={{ color: 'var(--text)' }}>{name(snapshot.user)}</strong>
        {snapshot.user.title && <span style={{ color: 'var(--text-muted)' }}> · {snapshot.user.title}</span>}
      </div>
      <div className="list-label" style={{ margin: 0 }}>Conversa privada com quem denunciou</div>
      {snapshot.conversation
        ? <MessageHistory messages={snapshot.conversation.messages} />
        : <p style={{ margin: 0, fontSize: '13px', color: 'var(--text-muted)' }}>Não há conversa privada entre os dois.</p>}
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
    <div>
      <div className="section-head">
        <span className="list-label">Denúncias{filter === 'open' && openCount > 0 ? ` · ${openCount} ${openCount === 1 ? 'aberta' : 'abertas'}` : ''}</span>
        <div style={{ display: 'flex', gap: '6px' }}>
          {(['open', 'all'] as const).map(f => (
            <button key={f} type="button" className={`uk-button uk-button-small ${filter === f ? 'uk-button-primary' : 'uk-button-default'}`} onClick={() => setFilter(f)}>
              {f === 'open' ? 'Abertas' : 'Todas'}
            </button>
          ))}
        </div>
      </div>

      <div className="card">
        {loading ? (
          <div style={{ padding: '20px', textAlign: 'center' }}><span uk-spinner="ratio: 0.7"></span></div>
        ) : reports.length === 0 ? (
          <p style={{ margin: 0, padding: '16px', fontSize: '13px', color: 'var(--text-muted)' }}>
            {filter === 'open' ? 'Nenhuma denúncia em aberto.' : 'Ainda não houve denúncias nesta comunidade.'}
          </p>
        ) : (
          reports.map(r => (
            <button key={r.id} type="button" className="conversation-item" onClick={() => open(r.id)}>
              <span uk-icon="icon: warning; ratio: 0.8"></span>
              <span style={{ flex: 1, minWidth: 0 }}>
                <span className="conversation-name">
                  {TYPE_LABELS[r.targetType]}{r.targetUser ? ` · ${name(r.targetUser)}` : ''}
                </span>
                <span className="conversation-preview" style={{ display: 'block' }}>
                  Enviada por {name(r.reporter)} · {formatDateTime(r.createdAt)}
                </span>
              </span>
              <span className="uk-label">{STATUS_LABELS[r.status]}</span>
            </button>
          ))
        )}
      </div>

      {detail && (
        <div className="modal-overlay" onClick={e => { if (e.target === e.currentTarget) setDetail(null); }}>
          <div className="modal-box" style={{ maxWidth: '640px' }}>
            <div className="modal-header">
              <h4>Denúncia — {TYPE_LABELS[detail.targetType]}</h4>
              <button className="modal-close-btn" onClick={() => setDetail(null)} aria-label="Fechar">
                <span uk-icon="icon: close; ratio: 0.9"></span>
              </button>
            </div>

            <div className="protection-row" style={{ fontSize: '13px', color: 'var(--text-muted)' }}>
              <span className="uk-label">{STATUS_LABELS[detail.status]}</span>
              <span>Enviada por <strong style={{ color: 'var(--text)' }}>{name(detail.reporter)}</strong> em {formatDateTime(detail.createdAt)}</span>
            </div>
            {detail.details && <p style={{ margin: '10px 0 0', fontSize: '13px' }}>“{detail.details}”</p>}
            {detail.resolution && <p style={{ margin: '10px 0 0', fontSize: '13px', color: 'var(--text-muted)' }}>Resultado: {detail.resolution}</p>}

            <div className="protection-section" style={{ maxHeight: '46vh', overflowY: 'auto' }}>
              <Snapshot snapshot={detail.snapshot} />
            </div>

            <div className="protection-section">
              {detail.status === 'open' ? (
                <>
                  {detail.targetUser && (
                    <div className="protection-row">
                      <span style={{ fontSize: '13px', color: 'var(--text-muted)' }}>{name(detail.targetUser)}:</span>
                      <select className="uk-select" value={days} onChange={e => setDays(Number(e.target.value))} style={{ width: 'auto' }} aria-label="Duração da suspensão">
                        {SUSPENSION_DAYS.map(d => <option key={d} value={d}>{d} {d === 1 ? 'dia' : 'dias'}</option>)}
                      </select>
                      <button className="uk-button uk-button-danger uk-button-small" onClick={() => moderate('suspend')} disabled={busy}>Suspender</button>
                      <button className="uk-button uk-button-danger uk-button-small" onClick={() => moderate('block')} disabled={busy}>Bloquear</button>
                    </div>
                  )}
                  <div className="protection-row">
                    <button className="uk-button uk-button-success uk-button-small" onClick={() => setStatus('resolved')} disabled={busy}>
                      <span uk-icon="icon: check; ratio: 0.75"></span> Marcar como resolvida
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
          </div>
        </div>
      )}
    </div>
  );
};

export default ReportsPanel;
