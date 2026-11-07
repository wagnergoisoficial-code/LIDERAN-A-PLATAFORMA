import { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import UIkit from 'uikit';
import { BIBLE_BOOKS, findBook, loadChapter, lastPlace, savePlace, reference, Verse } from '../lib/bible';
import { useComposer } from '../components/Composer';
import PageHeader from '../components/PageHeader';
import EmptyState from '../components/EmptyState';
import Icon from '../components/Icon';

// Leitura da Bíblia: livro e capítulo no endereço (/biblia/JHN/3); tocar num versículo
// escolhe-o para compartilhar no feed ou copiar
const Bible = () => {
  const params = useParams<{ book?: string; chapter?: string }>();
  const navigate = useNavigate();
  const { openComposer } = useComposer();
  const fallback = lastPlace();
  const book = findBook(params.book) || findBook(fallback.book)!;
  const chapter = Math.min(Math.max(Number(params.chapter) || (params.book ? 1 : fallback.chapter), 1), book.chapters);

  const [verses, setVerses] = useState<Verse[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [selected, setSelected] = useState<number[]>([]);
  const [attempt, setAttempt] = useState(0);

  useEffect(() => {
    let alive = true;
    setVerses(null);
    setError(null);
    setSelected([]);
    savePlace(book.id, chapter);
    loadChapter(book.id, chapter)
      .then(list => { if (alive) setVerses(list); })
      .catch(err => { if (alive) setError(err.message || 'Não foi possível carregar o capítulo.'); });
    return () => { alive = false; };
  }, [book.id, chapter, attempt]);

  const go = (bookId: string, chapterNumber: number) => {
    navigate(`/biblia/${bookId}/${chapterNumber}`);
    window.scrollTo(0, 0);
  };

  const index = BIBLE_BOOKS.findIndex(b => b.id === book.id);
  const previous = chapter > 1 ? { book: book.id, chapter: chapter - 1 } : index > 0 ? { book: BIBLE_BOOKS[index - 1].id, chapter: BIBLE_BOOKS[index - 1].chapters } : null;
  const next = chapter < book.chapters ? { book: book.id, chapter: chapter + 1 } : index < BIBLE_BOOKS.length - 1 ? { book: BIBLE_BOOKS[index + 1].id, chapter: 1 } : null;
  const label = (place: { book: string; chapter: number }) => `${findBook(place.book)!.name} ${place.chapter}`;

  const toggle = (verse: number) => setSelected(prev => (prev.includes(verse) ? prev.filter(v => v !== verse) : [...prev, verse]));
  const chosen = (verses || []).filter(v => selected.includes(v.verse));
  const ref = selected.length ? reference(book.name, chapter, selected) : '';
  const quote = `"${chosen.map(v => v.text).join(' ')}"\n${ref}`;

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(quote);
      UIkit.notification({ message: 'Versículo copiado', status: 'success', pos: 'top-right' });
    } catch {
      UIkit.notification({ message: 'Não foi possível copiar', status: 'danger', pos: 'top-right' });
    }
  };

  return (
    <div className="page is-narrow">
      <PageHeader title="Bíblia" subtitle="João Ferreira de Almeida. Toque num versículo para compartilhar no feed." />

      <div className="bible-bar">
        <label className="visually-hidden" htmlFor="bible-book">Livro</label>
        <select id="bible-book" className="uk-select" value={book.id} onChange={e => go(e.target.value, 1)}>
          <optgroup label="Antigo Testamento">
            {BIBLE_BOOKS.filter(b => b.testament === 'AT').map(b => <option key={b.id} value={b.id}>{b.name}</option>)}
          </optgroup>
          <optgroup label="Novo Testamento">
            {BIBLE_BOOKS.filter(b => b.testament === 'NT').map(b => <option key={b.id} value={b.id}>{b.name}</option>)}
          </optgroup>
        </select>
        <label className="visually-hidden" htmlFor="bible-chapter">Capítulo</label>
        <select id="bible-chapter" className="uk-select bible-chapter" value={chapter} onChange={e => go(book.id, Number(e.target.value))}>
          {Array.from({ length: book.chapters }, (_, i) => i + 1).map(n => <option key={n} value={n}>Capítulo {n}</option>)}
        </select>
        <span style={{ display: 'flex', gap: '2px', marginLeft: 'auto' }}>
          <button type="button" className="action-btn" disabled={!previous} onClick={() => previous && go(previous.book, previous.chapter)}
            aria-label={previous ? `Capítulo anterior: ${label(previous)}` : 'Sem capítulo anterior'} title="Capítulo anterior">
            <Icon name="chevron-left" />
          </button>
          <button type="button" className="action-btn" disabled={!next} onClick={() => next && go(next.book, next.chapter)}
            aria-label={next ? `Próximo capítulo: ${label(next)}` : 'Sem próximo capítulo'} title="Próximo capítulo">
            <Icon name="chevron-right" />
          </button>
        </span>
      </div>

      <article className="bible-text" aria-labelledby="bible-heading" aria-busy={!verses && !error}>
        <h2 id="bible-heading" className="bible-heading">{book.name} {chapter}</h2>
        {error ? (
          <EmptyState icon="warning" title={error} text="Verifique a conexão com a internet."
            action={<button type="button" className="uk-button uk-button-default" onClick={() => setAttempt(a => a + 1)}>Tentar de novo</button>} />
        ) : !verses ? (
          <div className="loading-block" role="status" aria-label="Carregando o capítulo"><span uk-spinner="ratio: 1"></span></div>
        ) : (
          <p className="bible-verses">
            {verses.map(v => (
              <span key={v.verse}>
                <span role="button" tabIndex={0} className="bible-verse" aria-pressed={selected.includes(v.verse)}
                  aria-label={`Versículo ${v.verse}: ${v.text}`}
                  onClick={() => toggle(v.verse)}
                  onKeyDown={e => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); toggle(v.verse); } }}>
                  <sup className="bible-num" aria-hidden="true">{v.verse}</sup>
                  <span aria-hidden="true">{v.text}</span>
                </span>{' '}
              </span>
            ))}
          </p>
        )}

        <nav className="bible-pager" aria-label="Capítulos">
          {previous ? (
            <button type="button" className="uk-button uk-button-default" onClick={() => go(previous.book, previous.chapter)}>
              <Icon name="chevron-left" size={18} /> {label(previous)}
            </button>
          ) : <span />}
          {next && (
            <button type="button" className="uk-button uk-button-default" onClick={() => go(next.book, next.chapter)}>
              {label(next)} <Icon name="chevron-right" size={18} />
            </button>
          )}
        </nav>
      </article>
      <p className="bible-note">Tradução João Ferreira de Almeida (domínio público), via bible-api.com.</p>

      {selected.length > 0 && (
        <div className="bible-actions" role="region" aria-label="Versículos escolhidos">
          <span className="bible-actions-ref">{ref}</span>
          <button type="button" className="ghost-btn" onClick={copy}><Icon name="copy" size={18} /> Copiar</button>
          <button type="button" className="uk-button uk-button-primary" onClick={() => { openComposer('post', quote); setSelected([]); }}>
            <Icon name="send" size={18} /> Compartilhar
          </button>
          <button type="button" className="action-btn" aria-label="Desmarcar versículos" onClick={() => setSelected([])}>
            <Icon name="close" size={18} />
          </button>
        </div>
      )}
    </div>
  );
};

export default Bible;
