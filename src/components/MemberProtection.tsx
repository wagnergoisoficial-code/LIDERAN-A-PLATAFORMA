import React, { useRef, useState } from 'react';
import UIkit from 'uikit';
import { api } from '../services/api';
import GuardianFields, { EMPTY_GUARDIAN, GuardianDraft, guardianPayload, relationshipLabel } from './GuardianFields';

interface Guardian {
  id: string;
  name: string;
  email: string;
  relationship?: string | null;
  authorizedAt?: string | null;
  authorizationMethod?: string | null;
  proofUrl?: string | null;
}

export interface ProtectedMember {
  id: string;
  name: string;
  isMinor?: boolean;
  status?: string;
  suspendedUntil?: string | null;
  statusReason?: string | null;
  guardians?: Guardian[];
}

const SUSPENSION_DAYS = [1, 3, 7, 15, 30, 90];

const formatDate = (value?: string | null) => (value ? new Date(value).toLocaleDateString('pt-BR') : '');

export const statusLabel = (member: ProtectedMember) => {
  if (member.status === 'pending_authorization') return 'Aguarda autorização dos pais';
  if (member.status === 'suspended') return member.suspendedUntil ? `Conta suspensa até ${formatDate(member.suspendedUntil)}` : 'Conta suspensa';
  if (member.status === 'blocked') return 'Conta bloqueada';
  return 'Conta ativa';
};

const methodLabel = (method?: string | null) =>
  method === 'guardian_app' ? 'pelo responsável na app' : method === 'leader_confirmation' ? 'confirmada pelo líder' : '';

interface MemberProtectionProps {
  churchId: string;
  member: ProtectedMember;
  onClose: () => void;
  onChanged: (member: ProtectedMember) => void;
}

// Painel do líder: estado da conta, autorização dos pais, responsáveis e moderação de um membro
const MemberProtection: React.FC<MemberProtectionProps> = ({ churchId, member, onClose, onChanged }) => {
  const [busy, setBusy] = useState(false);
  const [proof, setProof] = useState<File | null>(null);
  const proofInput = useRef<HTMLInputElement>(null);
  const [days, setDays] = useState(7);
  const [reason, setReason] = useState('');
  const [addingGuardian, setAddingGuardian] = useState(false);
  const [guardian, setGuardian] = useState<GuardianDraft>({ ...EMPTY_GUARDIAN });

  const run = async (action: () => Promise<any>, success: string) => {
    setBusy(true);
    try {
      const res = await action();
      if (res?.data) onChanged(res.data);
      UIkit.notification({ message: success, status: 'success', pos: 'top-right' });
      return true;
    } catch (err: any) {
      UIkit.notification({ message: err.message || 'Não foi possível concluir', status: 'danger', pos: 'top-right' });
      return false;
    } finally {
      setBusy(false);
    }
  };

  const authorize = () => run(() => api.authorizeMinor(churchId, member.id, proof), 'Autorização registrada: a conta está ativa');

  const moderate = (action: 'suspend' | 'block' | 'reactivate') => {
    const question = action === 'suspend'
      ? `Suspender ${member.name} por ${days} ${days === 1 ? 'dia' : 'dias'}?`
      : action === 'block' ? `Bloquear ${member.name}? A pessoa não poderá entrar até ser reativada.` : null;
    if (question && !confirm(question)) return;
    run(
      () => api.moderateMember(churchId, member.id, { action, days: action === 'suspend' ? days : undefined, reason: reason || undefined }),
      action === 'suspend' ? 'Membro suspenso' : action === 'block' ? 'Membro bloqueado' : 'Membro reativado'
    ).then(ok => { if (ok) setReason(''); });
  };

  const addGuardian = async (e: React.FormEvent) => {
    e.preventDefault();
    const ok = await run(() => api.addGuardian(churchId, member.id, guardianPayload(guardian)), 'Responsável vinculado ao membro');
    if (ok) {
      setAddingGuardian(false);
      setGuardian({ ...EMPTY_GUARDIAN });
    }
  };

  const restricted = member.status === 'suspended' || member.status === 'blocked';

  return (
    <div className="modal-overlay" onClick={e => { if (e.target === e.currentTarget) onClose(); }}>
      <div className="modal-box" style={{ maxWidth: '560px' }}>
        <div className="modal-header">
          <h4>Proteção e acesso — {member.name}</h4>
          <button className="modal-close-btn" onClick={onClose} aria-label="Fechar">
            <span uk-icon="icon: close; ratio: 0.9"></span>
          </button>
        </div>

        <div className="protection-row" style={{ fontSize: '13px' }}>
          <span className="uk-label">{statusLabel(member)}</span>
          {member.isMinor && <span className="uk-label">Menor de idade</span>}
          {member.statusReason && <span style={{ color: 'var(--text-muted)' }}>Motivo: {member.statusReason}</span>}
        </div>

        {member.status === 'pending_authorization' && (
          <div className="protection-section">
            <div className="list-label" style={{ margin: 0 }}>Autorização dos pais</div>
            <p style={{ margin: 0, fontSize: '13px', color: 'var(--text-muted)' }}>
              Confirme depois de receber a autorização assinada do responsável. A foto do termo é opcional.
            </p>
            <input ref={proofInput} type="file" accept="image/jpeg,image/png,image/webp" style={{ display: 'none' }}
              onChange={e => setProof(e.target.files?.[0] || null)} />
            <div className="protection-row">
              <button type="button" className="uk-button uk-button-default" onClick={() => proofInput.current?.click()} disabled={busy}>
                <span uk-icon="icon: image; ratio: 0.8"></span> {proof ? 'Trocar foto' : 'Anexar foto do termo'}
              </button>
              <button className="uk-button uk-button-success" onClick={authorize} disabled={busy}>
                <span uk-icon="icon: check; ratio: 0.8"></span> Confirmar autorização
              </button>
            </div>
            {proof && <span style={{ fontSize: '12px', color: 'var(--text-muted)' }}>Foto anexada: {proof.name}</span>}
          </div>
        )}

        {member.isMinor && (
          <div className="protection-section">
            <div className="list-label" style={{ margin: 0 }}>Responsáveis</div>
            {(member.guardians || []).length === 0 ? (
              <p style={{ margin: 0, fontSize: '13px', color: 'var(--text-muted)' }}>Nenhum responsável vinculado a este menor.</p>
            ) : (
              (member.guardians || []).map(g => (
                <div key={g.id} style={{ fontSize: '13px' }}>
                  <strong style={{ color: 'var(--text)' }}>{g.name}</strong>
                  <span style={{ color: 'var(--text-muted)' }}> · {relationshipLabel(g.relationship)} · {g.email}</span>
                  <div style={{ fontSize: '12px', color: 'var(--text-faint)' }}>
                    {g.authorizedAt
                      ? `Autorização em ${formatDate(g.authorizedAt)} ${methodLabel(g.authorizationMethod)}`.trim()
                      : 'Ainda sem autorização registrada'}
                    {g.proofUrl && <> · <a href={g.proofUrl} target="_blank" rel="noreferrer">ver termo</a></>}
                  </div>
                </div>
              ))
            )}
            {addingGuardian ? (
              <form onSubmit={addGuardian} style={{ display: 'grid', gap: '10px' }}>
                <GuardianFields value={guardian} onChange={setGuardian} intro="O responsável passa a poder ler as conversas privadas deste menor." />
                <div className="protection-row">
                  <button type="submit" className="uk-button uk-button-primary uk-button-small" disabled={busy}>Vincular responsável</button>
                  <button type="button" className="uk-button uk-button-default uk-button-small" onClick={() => setAddingGuardian(false)}>Cancelar</button>
                </div>
              </form>
            ) : (
              <div>
                <button className="uk-button uk-button-default uk-button-small" onClick={() => setAddingGuardian(true)}>
                  <span uk-icon="icon: plus; ratio: 0.75"></span> Adicionar responsável
                </button>
              </div>
            )}
          </div>
        )}

        {member.status !== 'pending_authorization' && (
          <div className="protection-section">
            <div className="list-label" style={{ margin: 0 }}>Suspender ou bloquear</div>
            <input className="uk-input" placeholder="Motivo (opcional, fica no histórico)" value={reason} onChange={e => setReason(e.target.value)} maxLength={500} />
            <div className="protection-row">
              <select className="uk-select" value={days} onChange={e => setDays(Number(e.target.value))} style={{ width: 'auto' }} aria-label="Duração da suspensão">
                {SUSPENSION_DAYS.map(d => <option key={d} value={d}>{d} {d === 1 ? 'dia' : 'dias'}</option>)}
              </select>
              <button className="uk-button uk-button-danger" onClick={() => moderate('suspend')} disabled={busy}>Suspender</button>
              <button className="uk-button uk-button-danger" onClick={() => moderate('block')} disabled={busy}>Bloquear</button>
              {restricted && (
                <button className="uk-button uk-button-success" onClick={() => moderate('reactivate')} disabled={busy}>
                  <span uk-icon="icon: check; ratio: 0.8"></span> Reativar
                </button>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default MemberProtection;
