// Bíblia Livre (português do Brasil, licença Creative Commons Atribuição 3.0 Brasil). O texto vai com a app,
// um ficheiro por livro em public/bible-data/livre/<n.º do livro>.json com [[versículos do cap. 1], ...]
// (null = versículo que a tradução não numera): assim a leitura não depende de serviços de fora.
const SOURCE = '/bible-data/livre';

export interface BibleBook { id: string; name: string; chapters: number; testament: 'AT' | 'NT' }
export interface Verse { verse: number; text: string }

const BOOKS: [string, string, number][] = [
  ['GEN', 'Gênesis', 50], ['EXO', 'Êxodo', 40], ['LEV', 'Levítico', 27], ['NUM', 'Números', 36], ['DEU', 'Deuteronômio', 34],
  ['JOS', 'Josué', 24], ['JDG', 'Juízes', 21], ['RUT', 'Rute', 4], ['1SA', '1 Samuel', 31], ['2SA', '2 Samuel', 24],
  ['1KI', '1 Reis', 22], ['2KI', '2 Reis', 25], ['1CH', '1 Crônicas', 29], ['2CH', '2 Crônicas', 36], ['EZR', 'Esdras', 10],
  ['NEH', 'Neemias', 13], ['EST', 'Ester', 10], ['JOB', 'Jó', 42], ['PSA', 'Salmos', 150], ['PRO', 'Provérbios', 31],
  ['ECC', 'Eclesiastes', 12], ['SNG', 'Cânticos', 8], ['ISA', 'Isaías', 66], ['JER', 'Jeremias', 52], ['LAM', 'Lamentações', 5],
  ['EZK', 'Ezequiel', 48], ['DAN', 'Daniel', 12], ['HOS', 'Oseias', 14], ['JOL', 'Joel', 3], ['AMO', 'Amós', 9],
  ['OBA', 'Obadias', 1], ['JON', 'Jonas', 4], ['MIC', 'Miqueias', 7], ['NAM', 'Naum', 3], ['HAB', 'Habacuque', 3],
  ['ZEP', 'Sofonias', 3], ['HAG', 'Ageu', 2], ['ZEC', 'Zacarias', 14], ['MAL', 'Malaquias', 4],
  ['MAT', 'Mateus', 28], ['MRK', 'Marcos', 16], ['LUK', 'Lucas', 24], ['JHN', 'João', 21], ['ACT', 'Atos', 28],
  ['ROM', 'Romanos', 16], ['1CO', '1 Coríntios', 16], ['2CO', '2 Coríntios', 13], ['GAL', 'Gálatas', 6], ['EPH', 'Efésios', 6],
  ['PHP', 'Filipenses', 4], ['COL', 'Colossenses', 4], ['1TH', '1 Tessalonicenses', 5], ['2TH', '2 Tessalonicenses', 3],
  ['1TI', '1 Timóteo', 6], ['2TI', '2 Timóteo', 4], ['TIT', 'Tito', 3], ['PHM', 'Filemom', 1], ['HEB', 'Hebreus', 13],
  ['JAS', 'Tiago', 5], ['1PE', '1 Pedro', 5], ['2PE', '2 Pedro', 3], ['1JN', '1 João', 5], ['2JN', '2 João', 1],
  ['3JN', '3 João', 1], ['JUD', 'Judas', 1], ['REV', 'Apocalipse', 22],
];

export const BIBLE_BOOKS: BibleBook[] = BOOKS.map(([id, name, chapters], i) => ({ id, name, chapters, testament: i < 39 ? 'AT' : 'NT' }));
export const findBook = (id?: string) => BIBLE_BOOKS.find(b => b.id === id?.toUpperCase());

const books = new Map<string, Promise<(string | null)[][]>>();

// Um livro de cada vez; fica em memória (e na cache do navegador) para os capítulos seguintes
const loadBook = (book: string) => {
  if (!books.has(book)) {
    const nr = BIBLE_BOOKS.findIndex(b => b.id === book) + 1;
    books.set(book, fetch(`${SOURCE}/${nr}.json`)
      .then(res => { if (!res.ok) throw new Error('Não foi possível abrir este livro.'); return res.json(); })
      .catch(err => { books.delete(book); throw err; }));
  }
  return books.get(book)!;
};

export const loadChapter = async (book: string, chapter: number): Promise<Verse[]> => {
  const texts: (string | null)[] | undefined = (await loadBook(book))[chapter - 1];
  if (!texts) throw new Error('Capítulo não encontrado.');
  return texts.flatMap((text, i) => (text ? [{ verse: i + 1, text }] : []));
};

// Onde a pessoa parou de ler
const LAST_KEY = 'lidera:biblia:onde';
export const lastPlace = (): { book: string; chapter: number } => {
  try {
    const saved = JSON.parse(localStorage.getItem(LAST_KEY) || 'null');
    if (saved && findBook(saved.book)) return saved;
  } catch { /* começa no início */ }
  return { book: 'JHN', chapter: 1 };
};
export const savePlace = (book: string, chapter: number) => {
  try { localStorage.setItem(LAST_KEY, JSON.stringify({ book, chapter })); } catch { /* sem armazenamento */ }
};

/** "João 3:16" ou "João 3:16-18" ou "João 3:16, 18" a partir dos versículos escolhidos. */
export const reference = (bookName: string, chapter: number, verses: number[]) => {
  const sorted = [...verses].sort((a, b) => a - b);
  const contiguous = sorted.every((v, i) => i === 0 || v === sorted[i - 1] + 1);
  const range = sorted.length === 1 ? `${sorted[0]}` : contiguous ? `${sorted[0]}-${sorted[sorted.length - 1]}` : sorted.join(', ');
  return `${bookName} ${chapter}:${range}`;
};
