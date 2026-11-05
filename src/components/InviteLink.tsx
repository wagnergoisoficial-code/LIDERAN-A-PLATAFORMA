import React, { useEffect, useState } from 'react';
import UIkit from 'uikit';
import { api } from '../services/api';

// Link de convite da comunidade: quem se regista por ele entra direto nela
const InviteLink: React.FC<{ churchId: string }> = ({ churchId }) => {
  const [code, setCode] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    setCode(null);
    api.getChurchInvite(churchId).then(res => setCode(res.data.code)).catch(() => {});
  }, [churchId]);

  const url = code ? `${window.location.origin}/convite/${code}` : '';

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(url);
      UIkit.notification({ message: 'Link copiado', status: 'success', pos: 'top-right' });
    } catch {
      UIkit.notification({ message: 'Não foi possível copiar: selecione o link e copie à mão', status: 'danger', pos: 'top-right' });
    }
  };

  const regenerate = async () => {
    if (!confirm('Gerar um link novo? O link atual deixa de funcionar.')) return;
    setBusy(true);
    try {
      const res = await api.regenerateChurchInvite(churchId);
      setCode(res.data.code);
      UIkit.notification({ message: 'Link novo gerado', status: 'success', pos: 'top-right' });
    } catch (err: any) {
      UIkit.notification({ message: err.message || 'Não foi possível gerar o link', status: 'danger', pos: 'top-right' });
    } finally {
      setBusy(false);
    }
  };

  return (
    <div>
      <div className="section-head">
        <span className="list-label">Link de convite</span>
      </div>
      <div className="card" style={{ padding: '16px' }}>
        <p style={{ margin: '0 0 10px', fontSize: '13px', color: 'var(--text-muted)', lineHeight: 1.5 }}>
          Quem se regista por este link entra direto nesta comunidade. Menores de 18 anos continuam a ser cadastrados por si, com os pais.
        </p>
        <div className="protection-row">
          <input className="form-input" style={{ flex: 1, minWidth: '220px' }} readOnly value={url} placeholder="A gerar o link..."
            aria-label="Link de convite" onFocus={e => e.currentTarget.select()} />
          <button type="button" className="uk-button uk-button-primary uk-button-small" onClick={copy} disabled={!code}>
            <span uk-icon="icon: copy; ratio: 0.75"></span> Copiar
          </button>
          <button type="button" className="uk-button uk-button-default uk-button-small" onClick={regenerate} disabled={busy || !code}>
            Gerar link novo
          </button>
        </div>
      </div>
    </div>
  );
};

export default InviteLink;
