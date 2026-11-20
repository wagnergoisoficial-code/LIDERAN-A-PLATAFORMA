import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import UIkit from 'uikit';
import QRCode from 'qrcode';
import { useAuth } from '../context/AuthContext';
import { canOpen } from '../lib/cargos';
import { money } from '../lib/format';
import { pixPayload } from '../lib/pix';
import { DonationConfig, DonationMethod, loadDonations } from '../lib/donations';
import Icon from './Icon';
import Modal from './Modal';

const PRESETS = [1, 5, 10, 20];
// O último botão é "50+": abre um campo para a pessoa escrever o valor
const MORE = 50;

const notify = (message: string, status: 'success' | 'danger' = 'danger') => UIkit.notification({ message, status, pos: 'top-right' });
const copy = async (text: string, what: string) => {
  try {
    await navigator.clipboard.writeText(text);
    notify(`${what} copiado`, 'success');
  } catch {
    notify('Não foi possível copiar');
  }
};

// QR Pix com o valor já preenchido (o Pix só existe em reais)
const PixQr: React.FC<{ method: DonationMethod; amount: number }> = ({ method, amount }) => {
  const code = pixPayload({ key: method.pixKey!, name: method.pixName || '', city: method.pixCity || '', amount });
  const [src, setSrc] = useState('');
  useEffect(() => { QRCode.toDataURL(code, { margin: 1, width: 400 }).then(setSrc).catch(() => setSrc('')); }, [code]);
  return (
    <div className="donate-qr">
      {src && <img className="donate-qr-img" src={src} alt={`QR Code Pix de ${money(amount, 'BRL')}`} />}
      <p className="form-hint" style={{ margin: 0 }}>Leia no app do banco: o valor já vem preenchido.</p>
      <button type="button" className="uk-button uk-button-default uk-button-small" onClick={() => copy(code, 'Código Pix')}>
        <Icon name="copy" size={16} /> Pix copia e cola
      </button>
    </div>
  );
};

const DonateDialog: React.FC<{ onClose: () => void }> = ({ onClose }) => {
  const { user } = useAuth();
  const [config, setConfig] = useState<DonationConfig | null>(null);
  const [amount, setAmount] = useState<number | null>(null);
  const [other, setOther] = useState(false);
  const [typed, setTyped] = useState(String(MORE));
  const [step, setStep] = useState<'amount' | 'pay'>('amount');

  useEffect(() => { loadDonations(true).then(setConfig); }, []);

  const currency = config?.currency || 'USD';
  const value = other ? Number(typed.replace(',', '.')) : amount;
  const valid = !!value && value > 0 && value <= 1_000_000;

  return (
    <Modal title="Fazer uma doação" onClose={onClose} width={500}>
      {step === 'amount' ? (
        <>
          <p className="donate-lead">{config?.message || 'A sua oferta ajuda a comunidade a continuar o trabalho. Escolha o valor.'}</p>
          <div className="donate-amounts" role="group" aria-label="Valor da doação">
            {PRESETS.map(v => (
              <button key={v} type="button" className={`donate-amount${!other && amount === v ? ' is-on' : ''}`} aria-pressed={!other && amount === v}
                onClick={() => { setOther(false); setAmount(v); }}>
                {money(v, currency, 0)}
              </button>
            ))}
            <button type="button" className={`donate-amount${other ? ' is-on' : ''}`} aria-pressed={other} onClick={() => setOther(true)}>
              {money(MORE, currency, 0)}+
            </button>
          </div>
          {other && (
            <div style={{ marginTop: '16px' }}>
              <label className="form-label" htmlFor="donate-value">Quanto quer doar?</label>
              <input id="donate-value" className="form-input" type="number" inputMode="decimal" min="1" step="0.01" autoFocus
                value={typed} onChange={e => setTyped(e.target.value)} />
            </div>
          )}
          <div className="form-btn-row">
            <button type="button" className="form-btn" onClick={onClose}>Cancelar</button>
            <button type="button" className="form-btn primary" disabled={!valid || !config} onClick={() => setStep('pay')}>Continuar</button>
          </div>
        </>
      ) : (
        <>
          <p className="donate-total">Doação de <strong>{money(value!, currency)}</strong></p>
          {config!.methods.length === 0 ? (
            <div className="donate-method">
              <p style={{ margin: 0 }}>A comunidade ainda não indicou as contas para receber doações.</p>
              {canOpen(user, 'tesoureiro') && (
                <Link to="/painel/doacoes" className="uk-button uk-button-primary" style={{ marginTop: '12px' }} onClick={onClose}>Configurar as formas de doar</Link>
              )}
            </div>
          ) : config!.methods.map(m => {
            const pixQr = !!m.pixKey && currency === 'BRL';
            return (
              <section key={m.id} className="donate-method" aria-label={m.label}>
                <h3>{m.label}</h3>
                {m.details && (
                  <>
                    <p className="donate-details">{m.details}</p>
                    <button type="button" className="link-btn" onClick={() => copy(m.details!, 'Dados')}>Copiar dados</button>
                  </>
                )}
                {m.pixKey && !pixQr && (
                  <p className="donate-details">Chave Pix: <strong>{m.pixKey}</strong>{' '}
                    <button type="button" className="link-btn" onClick={() => copy(m.pixKey!, 'Chave Pix')}>Copiar</button>
                  </p>
                )}
                {pixQr ? <PixQr method={m} amount={value!} /> : m.qrUrl && (
                  <div className="donate-qr">
                    <img className="donate-qr-img" src={m.qrUrl} alt={`QR Code para doar por ${m.label}`} />
                    <p className="form-hint" style={{ margin: 0 }}>Leia no app do banco e indique {money(value!, currency)}.</p>
                  </div>
                )}
              </section>
            );
          })}
          <p className="form-hint">Depois de doar, guarde o comprovante. Obrigado pela sua oferta!</p>
          <div className="form-btn-row">
            <button type="button" className="form-btn" onClick={() => setStep('amount')}>Voltar</button>
            <button type="button" className="form-btn primary" onClick={onClose}>Concluir</button>
          </div>
        </>
      )}
    </Modal>
  );
};

/** Botão "Doar": sempre no cabeçalho, para todos os membros da comunidade. */
const DonateButton: React.FC = () => {
  const { user } = useAuth();
  const [open, setOpen] = useState(false);
  if (!user?.churchId) return null;
  return (
    <>
      <button type="button" className="uk-button uk-button-success header-donate" onClick={() => setOpen(true)}>
        <Icon name="heart" size={18} strokeWidth={2} /> Doar
      </button>
      {open && <DonateDialog onClose={() => setOpen(false)} />}
    </>
  );
};

export default DonateButton;
