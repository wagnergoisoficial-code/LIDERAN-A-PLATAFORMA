// Cores de fundo dos textos curtos no feed (como os estados do WhatsApp).
// A mesma lista existe no backend (src/shared/utils/background.util.js). Todas com texto
// branco legível (contraste de 5:1 ou mais), sem amarelo.
export const BACKGROUNDS = [
  { key: 'azul', label: 'Azul', color: '#2f64e6' },
  { key: 'agua', label: 'Verde-água', color: '#0f766e' },
  { key: 'verde', label: 'Verde', color: '#15803d' },
  { key: 'vinho', label: 'Vinho', color: '#9f1239' },
  { key: 'terracota', label: 'Terracota', color: '#c2410c' },
  { key: 'rosa', label: 'Rosa', color: '#be185d' },
  { key: 'grafite', label: 'Grafite', color: '#1f2937' },
] as const;

export type BackgroundKey = typeof BACKGROUNDS[number]['key'] | 'none';

// Até este tamanho o texto aparece em cor; mais longo fica como texto normal
export const MAX_COLORED = 280;

export const fitsColor = (text?: string | null) => {
  const value = (text || '').trim();
  return !!value && value.length <= MAX_COLORED && value.split('\n').length <= 8;
};

// Cor a mostrar: a escolhida; sem escolha (textos antigos), uma da lista, sempre a mesma para o mesmo texto
export const backgroundColor = (key: string | null | undefined, id: string) => {
  if (key === 'none') return null;
  const chosen = BACKGROUNDS.find(b => b.key === key);
  if (chosen) return chosen.color;
  let hash = 0;
  for (let i = 0; i < id.length; i++) hash = (hash * 31 + id.charCodeAt(i)) >>> 0;
  return BACKGROUNDS[hash % BACKGROUNDS.length].color;
};

// Letra maior para textos mais curtos
export const textSize = (text: string) => (text.length <= 80 ? 'is-large' : text.length <= 160 ? 'is-medium' : 'is-small');
