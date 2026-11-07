import React, { createContext, useContext, useEffect, useRef, useState } from 'react';
import UIkit from 'uikit';
import { api } from '../services/api';
import { useAuth } from '../context/AuthContext';
import { useCommunity, announceFeedChange } from '../lib/community';
import { youtubeId, youtubeThumbnail, VIDEO_CATEGORIES, VideoCategory } from '../lib/youtube';
import { celebrate } from '../lib/motion';
import { EventFields, EventDraft, EMPTY_EVENT, eventPayload } from './EventForm';
import Avatar from './Avatar';
import Icon from './Icon';
import Modal from './Modal';

// Tudo o que se publica vai para o feed
type Kind = 'post' | 'video' | 'prayer' | 'donation' | 'devotional' | 'event' | 'poll';
export type ComposerStart = Kind | 'photo';

const KINDS: { value: Kind; label: string; leader?: boolean }[] = [
  { value: 'post', label: 'Publicação' },
  { value: 'video', label: 'Vídeo' },
  { value: 'prayer', label: 'Oração' },
  { value: 'donation', label: 'Doação' },
  { value: 'devotional', label: 'Devocional', leader: true },
  { value: 'event', label: 'Encontro', leader: true },
  { value: 'poll', label: 'Enquete', leader: true },
];

interface Draft {
  kind: Kind;
  content: string;
  title: string;
  verse: string;
  url: string;
  category: VideoCategory;
  place: string;
  coords: { latitude: number; longitude: number } | null;
  question: string;
  options: string[];
  expiresAt: string;
  event: EventDraft;
}

const EMPTY_DRAFT: Draft = {
  kind: 'post', content: '', title: '', verse: '', url: '', category: 'pregacao', place: '', coords: null,
  question: '', options: ['', ''], expiresAt: '', event: EMPTY_EVENT,
};
const MAX_CONTENT = 5000;
const MAX_IMAGE = 5 * 1024 * 1024;
const IMAGE_TYPES = ['image/jpeg', 'image/png', 'image/gif', 'image/webp'];

// Rascunho: o texto fica na sessão do navegador e a foto em memória, até publicar
const draftKey = (userId: string) => `lidera:rascunho:${userId}`;
let draftImage: { owner: string; file: File } | null = null;

const readDraft = (userId: string): Draft => {
  try {
    const saved = JSON.parse(sessionStorage.getItem(draftKey(userId)) || '{}');
    return { ...EMPTY_DRAFT, ...saved, event: { ...EMPTY_EVENT, ...(saved.event || {}) } };
  } catch {
    return EMPTY_DRAFT;
  }
};

const isEmptyDraft = (d: Draft) =>
  !d.content.trim() && !d.title.trim() && !d.verse.trim() && !d.url.trim() && !d.place.trim() && !d.coords
  && !d.question.trim() && d.options.every(o => !o.trim()) && !d.event.title.trim() && !d.event.startDate;

const writeDraft = (userId: string, draft: Draft) => {
  try {
    if (isEmptyDraft(draft)) sessionStorage.removeItem(draftKey(userId));
    else sessionStorage.setItem(draftKey(userId), JSON.stringify(draft));
  } catch { /* sem armazenamento: o rascunho dura até fechar */ }
};

const Optional = () => <span className="faint" style={{ fontWeight: 400 }}> (opcional)</span>;

interface ComposerProps {
  start?: ComposerStart;
  onPublished?: () => void;
}

/** Formulário de publicar no feed: publicação, vídeo, oração, doação e, para líderes, devocional, encontro e enquete. */
export const Composer: React.FC<ComposerProps> = ({ start, onPublished }) => {
  const { user } = useAuth();
  const { community } = useCommunity();
  const userId = user?.id || '';
  const isLeader = user?.role === 'leader' || user?.role === 'admin';
  const kinds = KINDS.filter(k => !k.leader || isLeader);
  const [draft, setDraft] = useState<Draft>(() => {
    const saved = readDraft(userId);
    const kind = start === 'photo' ? 'post' : start || saved.kind;
    return { ...saved, kind: kinds.some(k => k.value === kind) ? kind : 'post' };
  });
  const [image, setImage] = useState<File | null>(() => (draftImage?.owner === userId ? draftImage.file : null));
  const [preview, setPreview] = useState<string | null>(null);
  const [locating, setLocating] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const fileInput = useRef<HTMLInputElement>(null);
  const textarea = useRef<HTMLTextAreaElement>(null);
  const submitRef = useRef<HTMLButtonElement>(null);

  const set = (patch: Partial<Draft>) => {
    setError(null);
    setDraft(prev => ({ ...prev, ...patch }));
  };

  useEffect(() => { if (userId) writeDraft(userId, draft); }, [userId, draft]);

  useEffect(() => {
    draftImage = image ? { owner: userId, file: image } : null;
    if (!image) { setPreview(null); return; }
    const url = URL.createObjectURL(image);
    setPreview(url);
    return () => URL.revokeObjectURL(url);
  }, [image, userId]);

  // "Foto" na entrada do feed: abre logo a escolha da imagem (uma vez)
  const askedPhoto = useRef(false);
  useEffect(() => {
    if (start !== 'photo' || askedPhoto.current) return;
    askedPhoto.current = true;
    fileInput.current?.click();
  }, [start]);

  // A caixa de texto cresce com o texto
  useEffect(() => {
    const el = textarea.current;
    if (!el) return;
    el.style.height = 'auto';
    el.style.height = `${el.scrollHeight}px`;
  }, [draft.content, draft.kind]);

  const pickImage = (file?: File | null) => {
    if (!file) return;
    if (!IMAGE_TYPES.includes(file.type)) return setError('Escolha uma imagem JPEG, PNG, GIF ou WebP.');
    if (file.size > MAX_IMAGE) return setError('A imagem é muito grande: o máximo é 5 MB.');
    setError(null);
    setImage(file);
  };

  const useMyLocation = () => {
    if (!navigator.geolocation) return setError('Este navegador não informa a localização.');
    setLocating(true);
    navigator.geolocation.getCurrentPosition(
      pos => {
        set({ coords: { latitude: Number(pos.coords.latitude.toFixed(5)), longitude: Number(pos.coords.longitude.toFixed(5)) } });
        setLocating(false);
      },
      () => {
        setError('Não foi possível obter a localização. Autorize o acesso no navegador.');
        setLocating(false);
      },
      { enableHighAccuracy: true, timeout: 15000 },
    );
  };

  const { kind } = draft;
  const withPhoto = kind === 'post' || kind === 'donation';
  const videoId = kind === 'video' ? youtubeId(draft.url) : null;
  const filledOptions = draft.options.map(o => o.trim()).filter(Boolean);
  const canSubmit = {
    post: !!draft.content.trim() || !!image,
    donation: (!!draft.content.trim() || !!image) && draft.place.trim().length >= 3,
    video: !!videoId && draft.title.trim().length >= 3,
    prayer: !!draft.title.trim() && !!draft.content.trim(),
    devotional: draft.title.trim().length >= 3 && !!draft.verse.trim() && draft.content.trim().length >= 10,
    event: !!draft.event.title.trim() && !!draft.event.startDate,
    poll: draft.question.trim().length >= 5 && filledOptions.length >= 2,
  }[kind];

  const finish = (message: string) => {
    celebrate(submitRef.current);
    UIkit.notification({ message, status: 'success', pos: 'top-right' });
    setDraft({ ...EMPTY_DRAFT, kind });
    setImage(null);
    onPublished?.();
  };

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!canSubmit || saving) return;
    setSaving(true);
    setError(null);
    try {
      if (kind === 'post' || kind === 'donation') {
        const data = kind === 'donation'
          ? { content: draft.content, type: 'donation', location: draft.place.trim(), ...(draft.coords || {}) }
          : { content: draft.content };
        const res = await api.createPost(data, image || undefined);
        announceFeedChange('post', res.data);
        finish(kind === 'donation' ? 'Doação publicada para todas as comunidades' : 'Publicado no feed');
      } else if (kind === 'video') {
        const res = await api.createVideo({ url: draft.url.trim(), title: draft.title.trim(), category: draft.category, description: draft.content.trim() });
        announceFeedChange('video', res.data);
        finish(res.data?.status === 'approved' ? 'Vídeo publicado no feed' : 'Vídeo enviado: aparece no feed depois da aprovação do líder');
      } else if (kind === 'prayer') {
        const res = await api.createPrayerRequest({ title: draft.title.trim(), content: draft.content.trim() });
        announceFeedChange('prayer', res.data);
        finish('Pedido de oração publicado');
      } else if (kind === 'devotional') {
        await api.createDevotional({ title: draft.title.trim(), verse: draft.verse.trim(), content: draft.content.trim() });
        announceFeedChange('devotional');
        finish('Devocional publicado');
      } else if (kind === 'event') {
        const res = await api.createEvent(eventPayload(draft.event));
        announceFeedChange('event', res.data);
        finish('Encontro publicado');
      } else {
        const res = await api.createPoll({
          question: draft.question.trim(),
          options: filledOptions,
          expiresAt: draft.expiresAt ? new Date(`${draft.expiresAt}T23:59:59`).toISOString() : null,
        });
        announceFeedChange('poll', res.data);
        finish('Enquete publicada');
      }
    } catch (err: any) {
      // O rascunho fica como estava, para tentar de novo
      setError(err.message || 'Não foi possível publicar. Tente de novo.');
    } finally {
      setSaving(false);
    }
  };

  const everyone = kind === 'donation' || kind === 'video';
  const visibility = kind === 'video' && !isLeader
    ? 'Depois da aprovação do líder, todas as comunidades veem'
    : everyone ? 'Todas as comunidades veem' : `Visível para ${community?.name || 'sua comunidade'}`;

  const textField = (label: string, placeholder: string, rows = 4) => (
    <>
      <label className="visually-hidden" htmlFor="composer-text">{label}</label>
      <textarea id="composer-text" ref={textarea} className="composer-textarea" data-autofocus rows={rows} maxLength={MAX_CONTENT}
        placeholder={placeholder} value={draft.content} onChange={e => set({ content: e.target.value })} />
    </>
  );

  return (
    <form className="composer" onSubmit={submit} noValidate>
      <div className="guardian-mode" role="radiogroup" aria-label="O que quer publicar">
        {kinds.map(k => (
          <label key={k.value} className={kind === k.value ? 'is-selected' : ''}>
            <input type="radio" name="composer-kind" value={k.value} checked={kind === k.value} onChange={() => set({ kind: k.value })} />
            {k.label}
          </label>
        ))}
      </div>

      <div className="composer-author">
        <Avatar name={user?.name || ''} profileImage={user?.profileImage} size={40} />
        <span>
          {user?.name}
          <span className="composer-author-note" style={{ display: 'block' }}>{visibility}</span>
        </span>
      </div>

      {kind === 'post' && textField('Texto da publicação', 'O que você quer compartilhar?')}

      {kind === 'donation' && textField('O que está doando', 'O que você está doando? Ex.: sofá de 3 lugares em bom estado.')}

      {kind === 'prayer' && (
        <>
          <div>
            <label className="form-label" htmlFor="composer-title">Pedido de oração</label>
            <input id="composer-title" className="form-input" maxLength={120} placeholder="Ex.: Entrevista de emprego" aria-required="true"
              data-autofocus value={draft.title} onChange={e => set({ title: e.target.value })} />
          </div>
          <div>
            <label className="form-label" htmlFor="composer-text">Conte um pouco mais</label>
            <textarea id="composer-text" className="form-input" rows={4} maxLength={2000} aria-required="true"
              placeholder="A comunidade vai orar por você" value={draft.content} onChange={e => set({ content: e.target.value })} />
            <p className="form-hint">Seu nome aparece no pedido.</p>
          </div>
        </>
      )}

      {kind === 'video' && (
        <>
          <div>
            <label className="form-label" htmlFor="composer-url">Link do YouTube</label>
            <input id="composer-url" className="form-input" type="url" inputMode="url" placeholder="https://www.youtube.com/watch?v=…" aria-required="true"
              data-autofocus value={draft.url} onChange={e => set({ url: e.target.value })} />
            <p className="form-hint">
              {draft.url && !videoId ? 'Este link não é de um vídeo do YouTube.' : 'Filmou uma pregação ou um louvor? Envie para o YouTube e cole aqui o link.'}
            </p>
          </div>
          {videoId && <span className="video-thumb"><img src={youtubeThumbnail(videoId)} alt="Capa do vídeo" /></span>}
          <div className="form-grid">
            <div>
              <label className="form-label" htmlFor="composer-title">Título</label>
              <input id="composer-title" className="form-input" maxLength={120} placeholder="Ex.: Pregação de domingo" aria-required="true"
                value={draft.title} onChange={e => set({ title: e.target.value })} />
            </div>
            <div>
              <label className="form-label" htmlFor="composer-category">Tipo</label>
              <select id="composer-category" className="uk-select" value={draft.category} onChange={e => set({ category: e.target.value as VideoCategory })}>
                {(Object.keys(VIDEO_CATEGORIES) as VideoCategory[]).map(c => <option key={c} value={c}>{VIDEO_CATEGORIES[c]}</option>)}
              </select>
            </div>
          </div>
          <div>
            <label className="form-label" htmlFor="composer-text">Descrição<Optional /></label>
            <textarea id="composer-text" className="form-input" rows={2} maxLength={1000} value={draft.content} onChange={e => set({ content: e.target.value })} />
          </div>
        </>
      )}

      {kind === 'devotional' && (
        <>
          <div className="form-grid">
            <div>
              <label className="form-label" htmlFor="composer-title">Título</label>
              <input id="composer-title" className="form-input" maxLength={120} placeholder="Ex.: Fé em ação" aria-required="true"
                data-autofocus value={draft.title} onChange={e => set({ title: e.target.value })} />
            </div>
            <div>
              <label className="form-label" htmlFor="composer-verse">Versículo</label>
              <input id="composer-verse" className="form-input" maxLength={200} placeholder="Ex.: João 3:16" aria-required="true"
                value={draft.verse} onChange={e => set({ verse: e.target.value })} />
            </div>
          </div>
          <div>
            <label className="form-label" htmlFor="composer-text">Reflexão</label>
            <textarea id="composer-text" className="form-input" rows={6} maxLength={MAX_CONTENT} aria-required="true"
              placeholder="Escreva a reflexão de hoje…" value={draft.content} onChange={e => set({ content: e.target.value })} />
            <p className="form-hint">Fica no topo do feed durante 24 horas.</p>
          </div>
        </>
      )}

      {kind === 'event' && (
        <EventFields value={draft.event} onChange={patch => set({ event: { ...draft.event, ...patch } })} autoFocus />
      )}

      {kind === 'poll' && (
        <div className="form-stack">
          <div>
            <label className="form-label" htmlFor="poll-question">Pergunta</label>
            <input id="poll-question" className="form-input" data-autofocus aria-required="true" maxLength={200} placeholder="Ex.: Qual o melhor dia para o ensaio?"
              value={draft.question} onChange={e => set({ question: e.target.value })} />
          </div>
          <fieldset style={{ margin: 0, padding: 0, border: 0 }}>
            <legend className="form-label">Opções</legend>
            <div className="composer-poll-options">
              {draft.options.map((option, i) => (
                <div key={i} className="composer-poll-option">
                  <input className="form-input" maxLength={100} placeholder={`Opção ${i + 1}`} aria-label={`Opção ${i + 1}`}
                    value={option} onChange={e => set({ options: draft.options.map((o, idx) => (idx === i ? e.target.value : o)) })} />
                  {draft.options.length > 2 && (
                    <button type="button" className="action-btn" aria-label={`Remover opção ${i + 1}`}
                      onClick={() => set({ options: draft.options.filter((_, idx) => idx !== i) })}>
                      <Icon name="close" size={18} />
                    </button>
                  )}
                </div>
              ))}
            </div>
            {draft.options.length < 6 && (
              <button type="button" className="ghost-btn" style={{ marginTop: '6px', paddingLeft: 0 }} onClick={() => set({ options: [...draft.options, ''] })}>
                <Icon name="plus" size={18} /> Adicionar opção
              </button>
            )}
          </fieldset>
          <div>
            <label className="form-label" htmlFor="poll-expires">Encerra em<Optional /></label>
            <input id="poll-expires" className="form-input" type="date" style={{ maxWidth: '220px' }} min={new Date().toISOString().slice(0, 10)}
              value={draft.expiresAt} onChange={e => set({ expiresAt: e.target.value })} />
          </div>
        </div>
      )}

      {withPhoto && preview && (
        <div className="composer-preview">
          <img src={preview} alt="Imagem escolhida" />
          <button type="button" className="action-btn" aria-label="Remover imagem" onClick={() => setImage(null)}>
            <Icon name="close" size={18} />
          </button>
        </div>
      )}

      {kind === 'donation' && (
        <div>
          <label className="form-label" htmlFor="donation-place">Onde buscar</label>
          <input id="donation-place" className="form-input" type="text" aria-required="true" maxLength={200}
            placeholder="Bairro, cidade ou ponto de referência" value={draft.place} onChange={e => set({ place: e.target.value })} />
          <div className="protection-row" style={{ marginTop: '8px' }}>
            {draft.coords ? (
              <>
                <span className="composer-visibility"><Icon name="location" size={16} /> Localização GPS salva</span>
                <a href={`https://www.google.com/maps/search/?api=1&query=${draft.coords.latitude},${draft.coords.longitude}`} target="_blank" rel="noreferrer" style={{ fontSize: '14px', fontWeight: 600 }}>Ver no mapa</a>
                <button type="button" className="link-btn" onClick={() => set({ coords: null })}>Remover</button>
              </>
            ) : (
              <button type="button" className="uk-button uk-button-default uk-button-small" onClick={useMyLocation} disabled={locating}>
                <Icon name="location" size={16} /> {locating ? 'Obtendo a localização…' : 'Usar minha localização'}
              </button>
            )}
          </div>
          <p className="form-hint">A doação e o local ficam visíveis para todas as comunidades. Compartilhe só o que se sentir confortável.</p>
        </div>
      )}

      {error && (
        <div className="error-note" role="alert">
          <Icon name="warning" size={18} />
          <span>{error}</span>
        </div>
      )}

      <div className="composer-toolbar">
        {withPhoto ? (
          <>
            <input ref={fileInput} type="file" accept={IMAGE_TYPES.join(',')} hidden onChange={e => { pickImage(e.target.files?.[0]); e.target.value = ''; }} />
            <button type="button" className="ghost-btn" onClick={() => fileInput.current?.click()}>
              <Icon name="image" size={20} /> {image ? 'Trocar foto' : 'Foto'}
            </button>
          </>
        ) : <span />}
        <button ref={submitRef} type="submit" className="uk-button uk-button-primary" disabled={!canSubmit || saving}>
          {saving ? <><span uk-spinner="ratio: 0.5"></span> Publicando…</> : 'Publicar'}
        </button>
      </div>
    </form>
  );
};

const ComposerContext = createContext<{ openComposer: (start?: ComposerStart) => void }>({ openComposer: () => {} });

export const useComposer = () => useContext(ComposerContext);

/** Disponibiliza "Publicar" em toda a app: abre o formulário num diálogo, por cima da página atual. */
export const ComposerProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [open, setOpen] = useState<{ start?: ComposerStart } | null>(null);
  return (
    <ComposerContext.Provider value={{ openComposer: start => setOpen({ start }) }}>
      {children}
      {open && (
        <Modal title="Publicar" onClose={() => setOpen(null)} width={600}>
          <Composer start={open.start} onPublished={() => setOpen(null)} />
        </Modal>
      )}
    </ComposerContext.Provider>
  );
};
