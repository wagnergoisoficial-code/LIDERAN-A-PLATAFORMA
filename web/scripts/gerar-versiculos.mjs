// Gera public/bible-data/livre/sugestoes.json: versículos para sugerir ao publicar.
// Saem de capítulos e trechos edificantes (não da Bíblia inteira: genealogias e leis não servem para publicar).
// Uso: node web/scripts/gerar-versiculos.mjs
import { readFileSync, writeFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';

const root = fileURLToPath(new URL('../..', import.meta.url));
const dir = `${root}/public/bible-data/livre`;

// Nomes dos livros, na ordem dos ficheiros 1..66 (os mesmos de web/src/lib/bible.ts)
const names = [...readFileSync(`${root}/web/src/lib/bible.ts`, 'utf8').matchAll(/\['([0-9A-Z]{3})', '([^']+)', \d+\]/g)]
  .map(([, id, name]) => ({ id, name }));
if (names.length !== 66) throw new Error(`Esperava 66 livros, encontrei ${names.length}`);

// [livro, capítulo] = capítulo inteiro; [livro, capítulo, de, até] = trecho
const PASSAGES = [
  ['PSA', 1], ['PSA', 4], ['PSA', 8], ['PSA', 16], ['PSA', 18, 1, 3], ['PSA', 19, 1, 14], ['PSA', 23], ['PSA', 27],
  ['PSA', 30, 4, 5], ['PSA', 32, 8, 8], ['PSA', 34], ['PSA', 37, 3, 7], ['PSA', 40, 1, 3], ['PSA', 42], ['PSA', 46],
  ['PSA', 51, 10, 12], ['PSA', 55, 22, 22], ['PSA', 56, 3, 4], ['PSA', 62, 1, 8], ['PSA', 63, 1, 8], ['PSA', 84],
  ['PSA', 90, 12, 12], ['PSA', 91], ['PSA', 100], ['PSA', 103, 1, 22], ['PSA', 118, 24, 29], ['PSA', 119, 9, 16],
  ['PSA', 119, 105, 105], ['PSA', 121], ['PSA', 126], ['PSA', 127], ['PSA', 133], ['PSA', 136, 1, 3],
  ['PSA', 139, 1, 18], ['PSA', 143, 8, 10], ['PSA', 145], ['PSA', 147, 3, 5], ['PSA', 150],
  ['PRO', 3, 1, 12], ['PRO', 4, 23, 23], ['PRO', 16, 3, 3], ['PRO', 16, 9, 9], ['PRO', 17, 17, 17], ['PRO', 18, 10, 10],
  ['PRO', 20, 29, 29], ['PRO', 22, 6, 6], ['ECC', 3, 1, 8], ['ECC', 4, 9, 12], ['ECC', 12, 1, 1],
  ['ISA', 26, 3, 4], ['ISA', 40, 28, 31], ['ISA', 41, 10, 13], ['ISA', 43, 1, 2], ['ISA', 43, 18, 19], ['ISA', 54, 10, 10],
  ['ISA', 55, 6, 11], ['ISA', 58, 11, 11], ['ISA', 60, 1, 1], ['JER', 17, 7, 8], ['JER', 29, 11, 13], ['JER', 33, 3, 3],
  ['LAM', 3, 22, 26], ['JOS', 1, 8, 9], ['JOS', 24, 15, 15], ['DEU', 31, 6, 8], ['NUM', 6, 24, 26], ['ZEP', 3, 17, 17],
  ['MIC', 6, 8, 8], ['HAB', 3, 17, 19],
  ['MAT', 5, 3, 16], ['MAT', 6, 25, 34], ['MAT', 7, 7, 12], ['MAT', 11, 28, 30], ['MAT', 22, 37, 39], ['MAT', 28, 18, 20],
  ['MRK', 9, 23, 23], ['MRK', 10, 27, 27], ['MRK', 11, 24, 24], ['LUK', 1, 37, 37], ['LUK', 6, 31, 31], ['LUK', 6, 38, 38],
  ['LUK', 12, 32, 32], ['JHN', 1, 1, 5], ['JHN', 3, 16, 17], ['JHN', 8, 12, 12], ['JHN', 8, 32, 32], ['JHN', 10, 10, 11],
  ['JHN', 11, 25, 26], ['JHN', 13, 34, 35], ['JHN', 14, 1, 6], ['JHN', 14, 27, 27], ['JHN', 15, 5, 17], ['JHN', 16, 33, 33],
  ['ACT', 1, 8, 8], ['ACT', 20, 35, 35],
  ['ROM', 5, 1, 8], ['ROM', 8, 1, 1], ['ROM', 8, 18, 18], ['ROM', 8, 26, 39], ['ROM', 10, 9, 10], ['ROM', 12, 1, 21],
  ['ROM', 15, 13, 13], ['1CO', 2, 9, 9], ['1CO', 10, 13, 13], ['1CO', 13], ['1CO', 15, 58, 58], ['1CO', 16, 13, 14],
  ['2CO', 4, 16, 18], ['2CO', 5, 7, 7], ['2CO', 5, 17, 17], ['2CO', 9, 7, 7], ['2CO', 12, 9, 10], ['GAL', 2, 20, 20],
  ['GAL', 5, 22, 23], ['GAL', 6, 9, 9], ['EPH', 2, 8, 10], ['EPH', 3, 20, 21], ['EPH', 4, 2, 3], ['EPH', 4, 29, 32],
  ['EPH', 6, 10, 11], ['PHP', 1, 6, 6], ['PHP', 2, 3, 4], ['PHP', 3, 13, 14], ['PHP', 4, 4, 9], ['PHP', 4, 13, 13],
  ['PHP', 4, 19, 19], ['COL', 3, 12, 17], ['COL', 3, 23, 23], ['1TH', 5, 16, 18], ['1TI', 4, 12, 12], ['2TI', 1, 7, 7],
  ['2TI', 2, 22, 22], ['2TI', 3, 16, 17], ['HEB', 4, 16, 16], ['HEB', 10, 23, 25], ['HEB', 11, 1, 1], ['HEB', 11, 6, 6],
  ['HEB', 12, 1, 2], ['HEB', 13, 5, 8], ['JAS', 1, 2, 6], ['JAS', 1, 12, 12], ['JAS', 1, 17, 17], ['JAS', 1, 19, 19],
  ['JAS', 4, 8, 8], ['1PE', 5, 6, 7], ['1JN', 1, 9, 9], ['1JN', 3, 1, 1], ['1JN', 3, 18, 18], ['1JN', 4, 7, 19],
  ['REV', 3, 20, 20], ['REV', 21, 4, 4],
];

const books = new Map();
const book = (index) => {
  if (!books.has(index)) books.set(index, JSON.parse(readFileSync(`${dir}/${index}.json`, 'utf8')));
  return books.get(index);
};

const verses = [];
for (const [id, chapter, from, to] of PASSAGES) {
  const index = names.findIndex((b) => b.id === id) + 1;
  if (!index) throw new Error(`Livro desconhecido: ${id}`);
  const lines = book(index)[chapter - 1];
  if (!lines) throw new Error(`${id} ${chapter} não existe`);
  const first = from || 1;
  const last = Math.min(to || lines.length, lines.length);
  for (let v = first; v <= last; v++) {
    // "(Selá)" é uma pausa musical dos Salmos: fica de fora da publicação
    const text = (lines[v - 1] || '').replace(/\s*\(Selá\)/g, '')
      // Alguns versículos têm a frase seguinte colada à pontuação ("face.Eu")
      .replace(/([.;:!?])(\p{Lu})/gu, '$1 $2')
      .replace(/\s+/g, ' ').trim();
    // Nem curto demais (fora de contexto) nem longo demais para uma publicação
    if (text.length >= 30 && text.length <= 260) verses.push([`${names[index - 1].name} ${chapter}:${v}`, text]);
  }
}

const unique = [...new Map(verses.map((v) => [v[0], v])).values()];
writeFileSync(`${dir}/sugestoes.json`, JSON.stringify(unique));
console.log(`${unique.length} versículos em public/bible-data/livre/sugestoes.json`);
