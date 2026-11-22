// Versículos sugeridos ao publicar (Bíblia Livre): um sorteio por dia, de 4 a 7, entre centenas.
// A lista sai de web/scripts/gerar-versiculos.mjs.
export type Verse = [reference: string, text: string];

let pool: Promise<Verse[]> | null = null;

const loadPool = () =>
  (pool ??= fetch('/bible-data/livre/sugestoes.json')
    .then((res) => (res.ok ? res.json() : []))
    .catch(() => {
      pool = null;
      return [];
    }));

// Gerador com semente (mulberry32): o mesmo dia dá os mesmos versículos, o dia seguinte dá outros
const seeded = (seed: number) => () => {
  seed = (seed + 0x6d2b79f5) | 0;
  let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
  t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
  return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
};

export async function versesOfTheDay(date = new Date()): Promise<Verse[]> {
  const all = await loadPool();
  const random = seeded(date.getFullYear() * 10000 + (date.getMonth() + 1) * 100 + date.getDate());
  const count = Math.min(4 + Math.floor(random() * 4), all.length);
  const picked = new Set<number>();
  while (picked.size < count) picked.add(Math.floor(random() * all.length));
  return [...picked].map((i) => all[i]);
}

// Como o versículo entra no texto da publicação
export const quoteVerse = ([reference, text]: Verse) => `"${text}" (${reference})`;
