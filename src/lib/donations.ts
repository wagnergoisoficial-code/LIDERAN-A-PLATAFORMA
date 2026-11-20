import { api } from '../services/api';

export interface DonationMethod {
  id: string;
  label: string;
  details?: string | null;
  // Chave Pix: gera o QR com o valor escolhido (só com a moeda Real)
  pixKey?: string | null;
  pixName?: string | null;
  pixCity?: string | null;
  // Imagem de um QR Code fixo (M-Pesa, banco, Pix sem valor…)
  qrUrl?: string | null;
}

export interface DonationConfig { currency: string; message?: string | null; methods: DonationMethod[] }

export const CURRENCIES: { code: string; label: string }[] = [
  { code: 'USD', label: 'Dólar (US$)' },
  { code: 'BRL', label: 'Real (R$)' },
  { code: 'MZN', label: 'Metical (MT)' },
  { code: 'EUR', label: 'Euro (€)' },
  { code: 'AOA', label: 'Kwanza (Kz)' },
  { code: 'CVE', label: 'Escudo cabo-verdiano' },
];

export const NO_DONATIONS: DonationConfig = { currency: 'USD', message: null, methods: [] };

// A moeda e as formas de doar mudam pouco: a última resposta fica em memória
let cached: Promise<DonationConfig> | null = null;
export const loadDonations = (fresh = false) => {
  if (!cached || fresh) {
    cached = api.getDonations().then(res => res.data || NO_DONATIONS).catch(() => { cached = null; return NO_DONATIONS; });
  }
  return cached;
};
