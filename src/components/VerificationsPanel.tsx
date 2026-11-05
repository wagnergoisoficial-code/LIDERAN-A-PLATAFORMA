import React, { useCallback, useEffect, useState } from 'react';
import UIkit from 'uikit';
import { api } from '../services/api';

interface VerificationDocument { id: string; kind: 'identity' | 'leadership'; mimeType: string; size: number }
interface Verification {
  id: string;
  status: 'pending' | 'approved' | 'rejected';
  reason?: string | null;
  churchName: string;
  position: string;
  city: string;
  region: string;
  country: string;
  address?: string | null;
  phone: string;
  submittedAt: string;
  user: { id: string; name: string; email: string };
  documents: VerificationDocument[];
}

const STATUS_LABELS: Record<string, string> = { pending: 'Por analisar', approved: 'Aprovado', rejected: 'Recusado' };
const DOCUMENT_LABELS: Record<string, string> = { identity: 'Documento de identificação', leadership: 'Comprovativo de liderança' };
const formatDate = (value: string) => new Date(value).toLocaleDateString('pt-BR', { day: 'numeric', month: 'short', year: 'numeric' });

// Painel do administrador: pedidos de verificação de líderes, com os documentos e a decisão
const VerificationsPanel: React.FC = () => {
  const [list, setList] = useState<Verification[]>([]);
  const [filter, setFilter] = useState<'pending' | 'all'>('pending');
  const [loading, setLoading] = useState(true);
  const [open, setOpen] = useState<Verification | null>(null);
  const [reason, setReason] = useState('');
  const [busy, setBusy] = useState(false);

  const load = useCallback(async () => {
    try {
      const res = await api.getVerifications(filter === 'pending' ? 'pending' : undefined);
      setList(res.data);
    } catch { setList([]); }
    finally { setLoading(false); }
  }, [filter]);

  useEffect(() => { setLoading(true); load(); }, [load]);

  // A janela abre já no clique (senão o navegador bloqueia-a) e recebe o ficheiro quando chega
  const openDocument = async (doc: VerificationDocument) => {
    const tab = window.open('', '_blank');
    try {
      const blob = await api.getVerificationDocument(doc.id);
      const url = URL.createObjectURL(blob);
      if (tab) tab.location.href = url;
      else window.location.assign(url);
      setTimeout(() => URL.revokeObjectURL(url), 60_000);
    } catch (err: any) {
      tab?.close();
      UIkit.notification({ message: err.message || 'Não foi possível abrir o documento', status: 'danger', pos: 'top-right' });
    }
  };

  const decide = async (status: 'approved' | 'rejected') => {
    if (!open) return;
    if (status === 'rejected' && !reason.trim()) {
      UIkit.notification({ message: 'Escreva o motivo da recusa: o líder vai vê-lo', status: 'danger', pos: 'top-right' });
      return;
    }
    if (status === 'approved' && !confirm(`Aprovar ${open.user.name} como líder de ${open.churchName}?`)) return;
    setBusy(true);
    try {
      await api.reviewVerification(open.id, status, status === 'rejected' ? reason.trim() : undefined);
      UIkit.notification({ message: status === 'approved' ? 'Líder verificado' : 'Pedido recusado', status: 'success', pos: 'top-right' });
      setOpen(null);
      setReason('');
      load();
    } catch (err: any) {
      UIkit.notification({ message: err.message || 'Não foi possível concluir', status: 'danger', pos: 'top-right' });
    } finally {
      setBusy(false);
    }
  };

  const pendingCount = list.filter(v => v.status === 'pending').length;

  return (
    <div style={{ marginBottom: '24px' }}>
      <div className="section-head">
        <span className="list-label">Verificações de líderes{filter === 'pending' && pendingCount > 0 ? ` · ${pendingCount} por analisar` : ''}</span>
        <div style={{ display: 'flex', gap: '6px' }}>
          {(['pending', 'all'] as const).map(f => (
            <button key={f} type="button" className={`uk-button uk-button-small ${filter === f ? 'uk-button-primary' : 'uk-button-default'}`} onClick={() => setFilter(f)}>
              {f === 'pending' ? 'Por analisar' : 'Todas'}
            </button>
          ))}
        </div>
      </div>

      <div className="card">
        {loading ? (
          <div style={{ padding: '20px', textAlign: 'center' }}><span uk-spinner="ratio: 0.7"></span></div>
        ) : list.length === 0 ? (
          <p style={{ margin: 0, padding: '16px', fontSize: '13px', color: 'var(--text-muted)' }}>
            {filter === 'pending' ? 'Nenhum pedido por analisar.' : 'Ainda não houve pedidos de verificação.'}
          </p>
        ) : list.map(v => (
          <button key={v.id} type="button" className="conversation-item" onClick={() => { setOpen(v); setReason(''); }}>
            <span uk-icon="icon: user; ratio: 0.8"></span>
            <span style={{ flex: 1, minWidth: 0 }}>
              <span className="conversation-name">{v.user.name} · {v.churchName}</span>
              <span className="conversation-preview" style={{ display: 'block' }}>
                {v.position} · {v.city}, {v.region} · enviado em {formatDate(v.submittedAt)}
              </span>
            </span>
            <span className="uk-label">{STATUS_LABELS[v.status]}</span>
          </button>
        ))}
      </div>

      {open && (
        <div className="modal-overlay" onClick={e => { if (e.target === e.currentTarget) setOpen(null); }}>
          <div className="modal-box" style={{ maxWidth: '560px' }}>
            <div className="modal-header">
              <h4>Verificação — {open.user.name}</h4>
              <button className="modal-close-btn" onClick={() => setOpen(null)} aria-label="Fechar">
                <span uk-icon="icon: close; ratio: 0.9"></span>
              </button>
            </div>

            <div className="protection-row" style={{ fontSize: '13px', color: 'var(--text-muted)' }}>
              <span className="uk-label">{STATUS_LABELS[open.status]}</span>
              <span>{open.user.email} · enviado em {formatDate(open.submittedAt)}</span>
            </div>
            {open.status === 'rejected' && open.reason && (
              <p style={{ margin: '10px 0 0', fontSize: '13px', color: 'var(--text-muted)' }}>Motivo da recusa: {open.reason}</p>
            )}

            <div className="protection-section">
              <dl className="verification-data">
                <dt>Igreja</dt><dd>{open.churchName}</dd>
                <dt>Cargo</dt><dd>{open.position}</dd>
                <dt>Região</dt><dd>{open.city}, {open.region}, {open.country}</dd>
                {open.address && <><dt>Endereço</dt><dd>{open.address}</dd></>}
                <dt>Telefone</dt><dd>{open.phone}</dd>
              </dl>
            </div>

            <div className="protection-section">
              <div className="list-label" style={{ margin: 0 }}>Documentos</div>
              <div className="protection-row">
                {open.documents.map(doc => (
                  <button key={doc.id} type="button" className="uk-button uk-button-default uk-button-small" onClick={() => openDocument(doc)}>
                    <span uk-icon={`icon: ${doc.mimeType === 'application/pdf' ? 'file-pdf' : 'image'}; ratio: 0.75`}></span> {DOCUMENT_LABELS[doc.kind]}
                  </button>
                ))}
              </div>
            </div>

            {open.status === 'pending' && (
              <div className="protection-section">
                <textarea className="form-input" rows={2} style={{ height: 'auto', padding: '8px' }} maxLength={500}
                  placeholder="Motivo, se recusar (o líder vai vê-lo)" value={reason} onChange={e => setReason(e.target.value)} />
                <div className="protection-row">
                  <button className="uk-button uk-button-success uk-button-small" onClick={() => decide('approved')} disabled={busy}>
                    <span uk-icon="icon: check; ratio: 0.75"></span> Aprovar líder
                  </button>
                  <button className="uk-button uk-button-danger uk-button-small" onClick={() => decide('rejected')} disabled={busy}>Recusar</button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default VerificationsPanel;
