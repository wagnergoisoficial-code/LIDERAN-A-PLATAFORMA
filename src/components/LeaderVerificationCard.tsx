import React, { useEffect, useRef, useState } from 'react';
import UIkit from 'uikit';
import { api } from '../services/api';
import { useAuth } from '../context/AuthContext';
import Icon from './Icon';

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
}

const FIELDS: { key: keyof Verification; label: string; placeholder: string; optional?: boolean; wide?: boolean }[] = [
  { key: 'churchName', label: 'Igreja onde você é líder', placeholder: 'Ex.: Igreja Evangélica da Matola', wide: true },
  { key: 'position', label: 'Cargo na igreja', placeholder: 'Ex.: Pastor, líder de jovens' },
  { key: 'phone', label: 'Telefone', placeholder: '+258 84 000 0000' },
  { key: 'city', label: 'Cidade', placeholder: 'Ex.: Matola' },
  { key: 'region', label: 'Província ou estado', placeholder: 'Ex.: Maputo' },
  { key: 'country', label: 'País', placeholder: 'Ex.: Moçambique' },
  { key: 'address', label: 'Endereço da igreja (opcional)', placeholder: 'Rua, bairro', optional: true },
];
const ACCEPT = 'image/jpeg,image/png,image/webp,application/pdf';

const EMPTY = Object.fromEntries(FIELDS.map(f => [f.key, ''])) as Record<string, string>;

// Ficheiro escolhido por um botão (o campo nativo fica escondido, como na foto do perfil)
const FilePick: React.FC<{ label: string; hint: string; file: File | null; onChange: (file: File | null) => void }> = ({ label, hint, file, onChange }) => {
  const input = useRef<HTMLInputElement>(null);
  return (
    <div>
      <div className="form-label">{label}</div>
      <p className="form-hint" style={{ margin: '0 0 8px' }}>{hint}</p>
      <input ref={input} type="file" accept={ACCEPT} style={{ display: 'none' }} onChange={e => onChange(e.target.files?.[0] || null)} />
      <div className="protection-row">
        <button type="button" className="uk-button uk-button-default uk-button-small" onClick={() => input.current?.click()}>
          <Icon name="upload" size={16} /> {file ? 'Trocar arquivo' : 'Anexar arquivo'}
        </button>
        {file && <span className="muted truncate" style={{ fontSize: '13px', maxWidth: '100%' }}>{file.name}</span>}
      </div>
    </div>
  );
};

// Painel de um líder por verificar: envia os dados da igreja e os documentos ao administrador
const LeaderVerificationCard: React.FC = () => {
  const { refreshUser } = useAuth();
  const [verification, setVerification] = useState<Verification | null>(null);
  const [loading, setLoading] = useState(true);
  const [form, setForm] = useState<Record<string, string>>(EMPTY);
  const [identity, setIdentity] = useState<File | null>(null);
  const [leadership, setLeadership] = useState<File | null>(null);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    api.getMyVerification()
      .then(res => {
        // Aprovado entretanto: a sessão passa a ter o líder verificado e o Painel abre
        if (res.data.verified) return refreshUser();
        const v: Verification | null = res.data.verification;
        setVerification(v);
        if (v) setForm(Object.fromEntries(FIELDS.map(f => [f.key, String(v[f.key] || '')])));
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [refreshUser]);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!identity || !leadership) {
      UIkit.notification({ message: 'Anexe os dois documentos', status: 'danger', pos: 'top-right' });
      return;
    }
    setSaving(true);
    try {
      const res = await api.submitVerification(form, identity, leadership);
      setVerification(res.data);
      UIkit.notification({ message: 'Pedido enviado. Vai receber uma notificação com a decisão.', status: 'success', pos: 'top-right' });
    } catch (err: any) {
      UIkit.notification({ message: err.message || 'Não foi possível enviar o pedido', status: 'danger', pos: 'top-right' });
    } finally {
      setSaving(false);
    }
  };

  if (loading) return <div className="loading-block"><span uk-spinner="ratio: 1"></span></div>;

  if (verification?.status === 'pending') {
    return (
      <div className="card" style={{ padding: '20px' }}>
        <h2 className="list-label" style={{ marginBottom: '6px' }}>Verificação em análise</h2>
        <p style={{ fontSize: '15px' }}>
          Recebemos os dados de <strong>{verification.churchName}</strong> em {new Date(verification.submittedAt).toLocaleDateString('pt-BR')}.
        </p>
        <p className="form-hint">
          O administrador da plataforma está analisando o pedido. Assim que for aprovado, você recebe uma notificação e pode criar sua comunidade.
        </p>
      </div>
    );
  }

  return (
    <form className="card" style={{ padding: '20px' }} onSubmit={submit}>
      <h2 className="list-label" style={{ marginBottom: '6px' }}>Verificação de líder</h2>
      <p className="form-hint" style={{ margin: '0 0 16px' }}>
        Para criar uma comunidade, confirme que você é líder de uma igreja. Só o administrador da plataforma vê estes dados e documentos.
      </p>

      {verification?.status === 'rejected' && (
        <div className="error-note" role="alert" style={{ marginBottom: '16px' }}>
          <Icon name="warning" size={18} />
          <span>O pedido anterior foi recusado: {verification.reason}. Corrija e envie de novo.</span>
        </div>
      )}

      <div className="form-grid">
        {FIELDS.map(f => (
          <div key={f.key} style={f.wide ? { gridColumn: '1 / -1' } : undefined}>
            <label className="form-label" htmlFor={`verification-${f.key}`}>{f.label}</label>
            <input id={`verification-${f.key}`} className="form-input" type="text" placeholder={f.placeholder} maxLength={200}
              value={form[f.key]} onChange={e => setForm(prev => ({ ...prev, [f.key]: e.target.value }))} required={!f.optional} />
          </div>
        ))}
      </div>

      <div className="protection-section">
        <FilePick label="Documento de identidade" hint="Documento de identidade ou passaporte. PDF ou foto." file={identity} onChange={setIdentity} />
        <FilePick label="Comprovante de liderança" hint="Carta ou credencial da igreja que confirme seu cargo. PDF ou foto." file={leadership} onChange={setLeadership} />
      </div>

      <div className="form-btn-row" style={{ marginTop: '20px' }}>
        <button type="submit" className="form-btn primary" disabled={saving}>
          {saving ? <><span uk-spinner="ratio: 0.5"></span> Enviando…</> : 'Enviar para verificação'}
        </button>
      </div>
    </form>
  );
};

export default LeaderVerificationCard;
