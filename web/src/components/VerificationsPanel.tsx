import React, { useCallback, useEffect, useState } from 'react';
import UIkit from 'uikit';
import { api } from '../services/api';
import Icon from './Icon';
import Modal from './Modal';
import Chips, { Chip } from './Chips';

// Textos prontos para o administrador: um toque cola no campo, depois é só aprovar ou recusar
const APPROVE_NOTES: Chip[] = [
  { key: 'ok', label: 'Tudo certo', text: 'Dados e documentos confirmados. Bem-vindo à Fourux! Você já pode criar a sua comunidade.' },
  { key: 'bencao', label: 'Boas-vindas', text: 'Tudo certo com o seu cadastro. Que Deus abençoe o seu ministério com os jovens!' },
  { key: 'passo', label: 'Próximo passo', text: 'Verificação concluída. Crie a comunidade e convide os jovens com o link de convite.' },
];
const IMPROVE_NOTES: Chip[] = [
  { key: 'ilegivel', label: 'Documento ilegível', text: 'O documento de identificação está ilegível. Envie uma foto nítida, com todos os dados visíveis.' },
  { key: 'comprovante', label: 'Falta o comprovante', text: 'Falta o comprovante de liderança: envie uma carta ou credencial da igreja, assinada pelo pastor.' },
  { key: 'dados', label: 'Dados não conferem', text: 'Os dados da igreja não conferem com os documentos. Confira o nome e a cidade da igreja e envie de novo.' },
  { key: 'validade', label: 'Documento vencido', text: 'O documento enviado está fora da validade. Envie um documento válido.' },
  { key: 'telefone', label: 'Telefone', text: 'Não conseguimos confirmar o telefone informado. Atualize o contato e envie o pedido de novo.' },
];

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

const STATUS_LABELS: Record<string, string> = { pending: 'Para analisar', approved: 'Aprovado', rejected: 'Recusado' };
const DOCUMENT_LABELS: Record<string, string> = { identity: 'Documento de identificação', leadership: 'Comprovante de liderança' };
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
      // Na aprovação, a mensagem (se houver) segue com o aviso ao líder
      await api.reviewVerification(open.id, status, reason.trim() || undefined);
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
    <section style={{ marginBottom: '28px' }} aria-labelledby="verifications-title">
      <div className="section-head">
        <h2 id="verifications-title" className="list-label">Verificações de líderes{filter === 'pending' && pendingCount > 0 ? ` · ${pendingCount} para analisar` : ''}</h2>
        <div className="segmented" role="group" aria-label="Mostrar pedidos">
          {(['pending', 'all'] as const).map(f => (
            <button key={f} type="button" aria-pressed={filter === f} onClick={() => setFilter(f)}>
              {f === 'pending' ? 'Para analisar' : 'Todas'}
            </button>
          ))}
        </div>
      </div>

      <div className="card">
        {loading ? (
          <div className="loading-block" style={{ padding: '24px' }}><span uk-spinner="ratio: 0.7"></span></div>
        ) : list.length === 0 ? (
          <p className="list-empty">
            {filter === 'pending' ? 'Nenhum pedido para analisar.' : 'Ainda não houve pedidos de verificação.'}
          </p>
        ) : list.map(v => (
          <button key={v.id} type="button" className="conversation-item" onClick={() => { setOpen(v); setReason(''); }}>
            <span className="group-avatar" style={{ width: 40, height: 40 }}><Icon name="shield" size={18} /></span>
            <span style={{ flex: 1, minWidth: 0 }}>
              <span className="conversation-name"><span className="truncate">{v.user.name} · {v.churchName}</span></span>
              <span className="conversation-preview" style={{ display: 'block' }}>
                {v.position} · {v.city}, {v.region} · enviado em {formatDate(v.submittedAt)}
              </span>
            </span>
            <span className="tag">{STATUS_LABELS[v.status]}</span>
          </button>
        ))}
      </div>

      {open && (
        <Modal title={`Verificação de ${open.user.name}`} onClose={() => setOpen(null)} width={560}>
            <div className="protection-row" style={{ fontSize: '14px', color: 'var(--text-muted)' }}>
              <span className="tag">{STATUS_LABELS[open.status]}</span>
              <span>{open.user.email} · enviado em {formatDate(open.submittedAt)}</span>
            </div>
            {open.status === 'rejected' && open.reason && (
              <p className="muted" style={{ margin: '10px 0 0', fontSize: '14px' }}>Motivo da recusa: {open.reason}</p>
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
                    <Icon name={doc.mimeType === 'application/pdf' ? 'file-pdf' : 'image'} size={16} /> {DOCUMENT_LABELS[doc.kind]}
                  </button>
                ))}
              </div>
            </div>

            {open.status === 'pending' && (
              <div className="protection-section">
                <label className="form-label" htmlFor="verification-note">Mensagem para o líder</label>
                <p className="verification-chips-label">Para aprovar</p>
                <Chips label="Textos para aprovar" items={APPROVE_NOTES} onPick={setReason} />
                <p className="verification-chips-label">Para pedir melhorias</p>
                <Chips label="Textos para pedir melhorias" items={IMPROVE_NOTES} onPick={setReason} />
                <textarea id="verification-note" className="form-input" rows={3} maxLength={500}
                  placeholder="Escreva ou escolha um texto acima. Na recusa é obrigatório: o líder vai vê-lo."
                  value={reason} onChange={e => setReason(e.target.value)} />
                <div className="protection-row">
                  <button className="uk-button uk-button-success uk-button-small" onClick={() => decide('approved')} disabled={busy}>
                    <Icon name="check" size={16} /> Aprovar líder
                  </button>
                  <button className="uk-button uk-button-danger uk-button-small" onClick={() => decide('rejected')} disabled={busy}>Recusar</button>
                </div>
              </div>
            )}
        </Modal>
      )}
    </section>
  );
};

export default VerificationsPanel;
