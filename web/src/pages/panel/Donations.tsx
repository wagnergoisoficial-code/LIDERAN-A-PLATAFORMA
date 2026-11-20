import React, { useEffect, useState } from 'react';
import UIkit from 'uikit';
import { api } from '../../services/api';
import { CURRENCIES, DonationConfig, DonationMethod, loadDonations } from '../../lib/donations';
import Icon from '../../components/Icon';
import PageHeader from '../../components/PageHeader';

const notify = (message: string, status: 'success' | 'danger' = 'danger') => UIkit.notification({ message, status, pos: 'top-right' });
const MAX_METHODS = 8;

/** Tesouraria: as contas, a chave Pix e o QR Code que aparecem no botão "Doar". */
const Donations = () => {
  const [config, setConfig] = useState<DonationConfig | null>(null);
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState<number | null>(null);

  useEffect(() => { loadDonations(true).then(setConfig); }, []);

  if (!config) return <div className="card loading-block"><span uk-spinner="ratio: 0.8"></span></div>;

  const setMethod = (index: number, change: Partial<DonationMethod>) =>
    setConfig(c => c && { ...c, methods: c.methods.map((m, i) => (i === index ? { ...m, ...change } : m)) });
  const field = (index: number, key: keyof DonationMethod) => ({
    value: (config.methods[index][key] as string) || '',
    onChange: (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => setMethod(index, { [key]: e.target.value }),
  });

  const uploadQr = async (index: number, file?: File) => {
    if (!file) return;
    setUploading(index);
    try {
      const res = await api.uploadDonationQr(file);
      setMethod(index, { qrUrl: res.data.url });
    } catch (err: any) {
      notify(err.message || 'Não foi possível enviar a imagem');
    } finally {
      setUploading(null);
    }
  };

  const save = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    try {
      const res = await api.saveDonations(config);
      setConfig(res.data);
      loadDonations(true);
      notify(res.message, 'success');
    } catch (err: any) {
      notify(err.message || 'Não foi possível guardar');
    } finally {
      setSaving(false);
    }
  };

  return (
    <form onSubmit={save}>
      <PageHeader title="Doações" subtitle='O que aparece quando alguém toca em "Doar": as contas, a chave Pix e o QR Code da comunidade.'
        actions={<button type="submit" className="uk-button uk-button-primary" disabled={saving}>{saving ? 'Guardando…' : 'Guardar'}</button>} />

      <div className="card" style={{ padding: '20px', marginBottom: '24px' }}>
        <div className="form-grid">
          <div>
            <label className="form-label" htmlFor="don-currency">Moeda</label>
            <select id="don-currency" className="form-input" value={config.currency} onChange={e => setConfig({ ...config, currency: e.target.value })}>
              {CURRENCIES.map(c => <option key={c.code} value={c.code}>{c.label}</option>)}
            </select>
            <p className="form-hint" style={{ margin: '6px 0 0' }}>Vale para as doações e para a tesouraria.</p>
          </div>
          <div className="is-wide">
            <label className="form-label" htmlFor="don-message">Mensagem <span className="faint" style={{ fontWeight: 400 }}>(opcional)</span></label>
            <input id="don-message" className="form-input" maxLength={300} placeholder="A sua oferta ajuda a comunidade a continuar o trabalho."
              value={config.message || ''} onChange={e => setConfig({ ...config, message: e.target.value })} />
          </div>
        </div>
      </div>

      <div className="section-head">
        <h2 className="list-label">Formas de doar · {config.methods.length}</h2>
        <button type="button" className="uk-button uk-button-default" disabled={config.methods.length >= MAX_METHODS}
          onClick={() => setConfig({ ...config, methods: [...config.methods, { id: '', label: '' }] })}>
          <Icon name="plus" size={18} /> Adicionar
        </button>
      </div>

      {config.methods.length === 0 && (
        <div className="card" style={{ padding: '20px' }}>
          <p style={{ margin: 0 }} className="muted">Ainda não há formas de doar. Adicione uma conta bancária, uma chave Pix, um número de M-Pesa ou um QR Code.</p>
        </div>
      )}

      {config.methods.map((m, i) => (
        <section key={i} className="card donation-form" aria-label={m.label || `Forma de doar ${i + 1}`}>
          <div className="section-head">
            <strong>{m.label || `Forma de doar ${i + 1}`}</strong>
            <button type="button" className="link-btn" onClick={() => setConfig({ ...config, methods: config.methods.filter((_, j) => j !== i) })}>Remover</button>
          </div>
          <div className="form-grid">
            <div className="is-wide">
              <label className="form-label" htmlFor={`don-label-${i}`}>Nome</label>
              <input id={`don-label-${i}`} className="form-input" required maxLength={60} placeholder="Ex.: Pix, Conta no BCI, M-Pesa" {...field(i, 'label')} />
            </div>
            <div className="is-wide">
              <label className="form-label" htmlFor={`don-details-${i}`}>Dados da conta <span className="faint" style={{ fontWeight: 400 }}>(opcional)</span></label>
              <textarea id={`don-details-${i}`} className="form-input" rows={3} maxLength={500}
                placeholder="Banco, titular, número da conta, NIB/IBAN ou número de telefone" {...field(i, 'details')} />
            </div>
            <div className="is-wide">
              <label className="form-label" htmlFor={`don-pix-${i}`}>Chave Pix <span className="faint" style={{ fontWeight: 400 }}>(opcional; com a moeda Real, o QR já leva o valor)</span></label>
              <input id={`don-pix-${i}`} className="form-input" maxLength={100} placeholder="E-mail, telefone, CPF/CNPJ ou chave aleatória" {...field(i, 'pixKey')} />
            </div>
            {m.pixKey && (
              <>
                <div>
                  <label className="form-label" htmlFor={`don-pixname-${i}`}>Nome do recebedor</label>
                  <input id={`don-pixname-${i}`} className="form-input" required maxLength={25} {...field(i, 'pixName')} />
                </div>
                <div>
                  <label className="form-label" htmlFor={`don-pixcity-${i}`}>Cidade</label>
                  <input id={`don-pixcity-${i}`} className="form-input" required maxLength={15} {...field(i, 'pixCity')} />
                </div>
              </>
            )}
            <div className="is-wide">
              <label className="form-label" htmlFor={`don-qr-${i}`}>Imagem do QR Code <span className="faint" style={{ fontWeight: 400 }}>(opcional)</span></label>
              {m.qrUrl && <img className="donate-qr-img" src={m.qrUrl} alt="QR Code atual" style={{ marginBottom: '8px' }} />}
              <input id={`don-qr-${i}`} className="form-input" type="file" accept="image/jpeg,image/png,image/webp" disabled={uploading === i}
                onChange={e => uploadQr(i, e.target.files?.[0])} />
              {m.qrUrl && <button type="button" className="link-btn" onClick={() => setMethod(i, { qrUrl: null })}>Remover imagem</button>}
            </div>
          </div>
        </section>
      ))}
    </form>
  );
};

export default Donations;
