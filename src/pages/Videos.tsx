import React, { useEffect, useState } from 'react';
import UIkit from 'uikit';
import { api } from '../services/api';
import { useAuth } from '../context/AuthContext';
import PageHeader from '../components/PageHeader';
import EmptyState from '../components/EmptyState';
import ReportButton from '../components/ReportButton';

type Category = 'pregacao' | 'hino' | 'membro';
interface Video {
  id: string;
  title: string;
  description?: string | null;
  category: Category;
  provider: string;
  sourceId: string;
  status: 'pending' | 'approved' | 'rejected';
  reason?: string | null;
  createdAt: string;
  author: { id: string; name: string } | null;
  church: { id: string; name: string } | null;
}

const SHELVES: { key: Category; title: string }[] = [
  { key: 'pregacao', title: 'Pregações' },
  { key: 'hino', title: 'Hinos' },
  { key: 'membro', title: 'Dos membros' },
];
const CATEGORY_LABELS: Record<Category, string> = { pregacao: 'Pregação', hino: 'Hino', membro: 'Vídeo de membro' };

// Mesma leitura do backend, só para mostrar a capa antes de enviar
const youtubeId = (link: string) => {
  try {
    const url = new URL(link.trim());
    const id = url.hostname === 'youtu.be'
      ? url.pathname.slice(1)
      : url.searchParams.get('v') || url.pathname.match(/^\/(?:shorts|embed|live)\/([^/?]+)/)?.[1];
    return /youtube\.com$|youtu\.be$|youtube-nocookie\.com$/.test(url.hostname) && /^[\w-]{11}$/.test(id || '') ? id! : null;
  } catch {
    return null;
  }
};
const thumbnail = (sourceId: string) => `https://i.ytimg.com/vi/${sourceId}/hqdefault.jpg`;

const VideoCard: React.FC<{ video: Video; onOpen: (video: Video) => void; children?: React.ReactNode }> = ({ video, onOpen, children }) => (
  <div className="video-card">
    <button type="button" className="video-open" onClick={() => onOpen(video)} aria-label={`Ver ${video.title}`}>
      <span className="video-thumb"><img src={thumbnail(video.sourceId)} alt="" loading="lazy" /></span>
      <span className="video-title">{video.title}</span>
      <span className="video-meta">{video.author?.name}{video.church ? ` · ${video.church.name}` : ''}</span>
    </button>
    {children}
  </div>
);

// Vídeos de todas as comunidades em filas horizontais; os dos membros esperam pela aprovação do líder
const Videos: React.FC = () => {
  const { user } = useAuth();
  const isLeader = user?.role === 'leader' || user?.role === 'admin';
  const [videos, setVideos] = useState<Video[]>([]);
  const [waiting, setWaiting] = useState<Video[]>([]);
  const [loading, setLoading] = useState(true);
  const [playing, setPlaying] = useState<Video | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({ url: '', title: '', category: 'pregacao' as Category, description: '' });
  const [saving, setSaving] = useState(false);

  const load = async () => {
    try {
      const res = await api.getVideos();
      setVideos(res.data.videos);
      setWaiting(res.data.waiting);
    } catch { /* lista vazia */ }
    finally { setLoading(false); }
  };

  useEffect(() => { load(); }, []);

  const preview = youtubeId(form.url);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    try {
      const res = await api.createVideo(form);
      UIkit.notification({ message: res.message, status: 'success', pos: 'top-right' });
      setShowForm(false);
      setForm({ url: '', title: '', category: 'pregacao', description: '' });
      load();
    } catch (err: any) {
      UIkit.notification({ message: err.message || 'Não foi possível enviar o vídeo', status: 'danger', pos: 'top-right' });
    } finally {
      setSaving(false);
    }
  };

  const review = async (video: Video, status: 'approved' | 'rejected') => {
    let reason: string | undefined;
    if (status === 'rejected') {
      const answer = prompt(`Recusar "${video.title}"? Escreva o motivo para o autor (opcional):`);
      if (answer === null) return;
      reason = answer;
    }
    try {
      await api.reviewVideo(video.id, status, reason);
      UIkit.notification({ message: status === 'approved' ? 'Vídeo aprovado: já aparece para todas as comunidades' : 'Vídeo recusado', status: 'success', pos: 'top-right' });
      load();
    } catch (err: any) {
      UIkit.notification({ message: err.message || 'Não foi possível concluir', status: 'danger', pos: 'top-right' });
    }
  };

  const remove = async (video: Video) => {
    if (!confirm(`Apagar "${video.title}"?`)) return;
    try {
      await api.deleteVideo(video.id);
      setPlaying(null);
      load();
      UIkit.notification({ message: 'Vídeo apagado', status: 'success', pos: 'top-right' });
    } catch (err: any) {
      UIkit.notification({ message: err.message || 'Não foi possível apagar', status: 'danger', pos: 'top-right' });
    }
  };

  const canRemove = (video: Video) =>
    video.author?.id === user?.id || user?.role === 'admin' || (user?.role === 'leader' && video.church?.id === user?.churchId);

  return (
    <div>
      <PageHeader
        icon="play-circle"
        title="Vídeos"
        subtitle="Pregações, hinos e vídeos dos membros de todas as comunidades"
        actions={(
          <button className="uk-button uk-button-primary" onClick={() => setShowForm(true)}>
            <span uk-icon="icon: plus; ratio: 0.85"></span> Enviar vídeo
          </button>
        )}
      />

      {loading ? (
        <div style={{ padding: '60px', textAlign: 'center' }}><span uk-spinner="ratio: 1.2"></span></div>
      ) : (
        <>
          {waiting.length > 0 && (
            <section className="video-shelf">
              <div className="list-label">{isLeader ? `Por aprovar · ${waiting.length}` : 'Os seus vídeos'}</div>
              <div className="video-row">
                {waiting.map(v => (
                  <VideoCard key={v.id} video={v} onOpen={setPlaying}>
                    {isLeader ? (
                      <div className="protection-row">
                        <button className="uk-button uk-button-success uk-button-small" onClick={() => review(v, 'approved')}>
                          <span uk-icon="icon: check; ratio: 0.7"></span> Aprovar
                        </button>
                        <button className="uk-button uk-button-danger uk-button-small" onClick={() => review(v, 'rejected')}>Recusar</button>
                      </div>
                    ) : (
                      <span className="video-meta">
                        <span className="uk-label">{v.status === 'pending' ? 'À espera do líder' : 'Recusado'}</span>
                        {v.reason && ` ${v.reason}`}
                      </span>
                    )}
                  </VideoCard>
                ))}
              </div>
            </section>
          )}

          {SHELVES.map(shelf => {
            const list = videos.filter(v => v.category === shelf.key);
            if (!list.length) return null;
            return (
              <section key={shelf.key} className="video-shelf">
                <div className="list-label">{shelf.title}</div>
                <div className="video-row">
                  {list.map(v => <VideoCard key={v.id} video={v} onOpen={setPlaying} />)}
                </div>
              </section>
            );
          })}

          {videos.length === 0 && waiting.length === 0 && (
            <EmptyState icon="play-circle" title="Ainda não há vídeos" text="Envie o link de uma pregação ou de um hino no YouTube." />
          )}
        </>
      )}

      {playing && (
        <div className="modal-overlay" onClick={e => { if (e.target === e.currentTarget) setPlaying(null); }}>
          <div className="modal-box" style={{ maxWidth: '860px' }}>
            <div className="modal-header">
              <h4>{playing.title}</h4>
              <button className="modal-close-btn" onClick={() => setPlaying(null)} aria-label="Fechar">
                <span uk-icon="icon: close; ratio: 0.9"></span>
              </button>
            </div>
            <div className="video-player">
              <iframe
                src={`https://www.youtube-nocookie.com/embed/${playing.sourceId}?autoplay=1&rel=0`}
                title={playing.title}
                allow="autoplay; encrypted-media; picture-in-picture; fullscreen"
                allowFullScreen
              />
            </div>
            <div className="protection-row" style={{ justifyContent: 'space-between', marginTop: '12px' }}>
              <span style={{ fontSize: '13px', color: 'var(--text-muted)' }}>
                {CATEGORY_LABELS[playing.category]} · {playing.author?.name}{playing.church ? ` · ${playing.church.name}` : ''}
              </span>
              <span className="protection-row">
                {playing.status === 'approved' && playing.author?.id !== user?.id && <ReportButton targetType="video" targetId={playing.id} compact />}
                {canRemove(playing) && (
                  <button className="action-btn" title="Apagar vídeo" onClick={() => remove(playing)}>
                    <span uk-icon="icon: trash; ratio: 0.8"></span>
                  </button>
                )}
              </span>
            </div>
            {playing.description && <p style={{ margin: '8px 0 0', fontSize: '13px', color: 'var(--text)', lineHeight: 1.5 }}>{playing.description}</p>}
          </div>
        </div>
      )}

      {showForm && (
        <div className="modal-overlay" onClick={e => { if (e.target === e.currentTarget) setShowForm(false); }}>
          <form className="modal-box" style={{ maxWidth: '520px' }} onSubmit={submit}>
            <div className="modal-header">
              <h4>Enviar vídeo</h4>
              <button type="button" className="modal-close-btn" onClick={() => setShowForm(false)} aria-label="Fechar">
                <span uk-icon="icon: close; ratio: 0.9"></span>
              </button>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
              <div>
                <label className="form-label" htmlFor="video-url">Link do YouTube *</label>
                <input id="video-url" className="form-input" type="url" placeholder="https://www.youtube.com/watch?v=..." required
                  value={form.url} onChange={e => setForm(f => ({ ...f, url: e.target.value }))} />
              </div>
              {preview && <span className="video-thumb"><img src={thumbnail(preview)} alt="Capa do vídeo" /></span>}
              <div>
                <label className="form-label" htmlFor="video-title">Título *</label>
                <input id="video-title" className="form-input" type="text" maxLength={120} required placeholder="Ex.: Pregação de domingo — O poder do louvor"
                  value={form.title} onChange={e => setForm(f => ({ ...f, title: e.target.value }))} />
              </div>
              <div>
                <label className="form-label" htmlFor="video-category">Tipo</label>
                <select id="video-category" className="uk-select" value={form.category} onChange={e => setForm(f => ({ ...f, category: e.target.value as Category }))}>
                  {(Object.keys(CATEGORY_LABELS) as Category[]).map(c => <option key={c} value={c}>{CATEGORY_LABELS[c]}</option>)}
                </select>
              </div>
              <div>
                <label className="form-label" htmlFor="video-description">Descrição</label>
                <textarea id="video-description" className="form-input" rows={3} maxLength={1000} style={{ height: 'auto', padding: '8px' }}
                  value={form.description} onChange={e => setForm(f => ({ ...f, description: e.target.value }))} />
              </div>
              <p style={{ margin: 0, fontSize: '12px', color: 'var(--text-muted)' }}>
                {isLeader
                  ? 'Como líder, o seu vídeo aparece logo para todas as comunidades.'
                  : 'O líder da sua comunidade aprova o vídeo antes de ele aparecer para todas as comunidades.'}
              </p>
            </div>
            <div className="form-btn-row" style={{ marginTop: '20px' }}>
              <button type="button" className="form-btn" onClick={() => setShowForm(false)}>Cancelar</button>
              <button type="submit" className="form-btn primary" disabled={saving || !preview}>
                {saving ? <><span uk-spinner="ratio: 0.5"></span> Enviando...</> : 'Enviar vídeo'}
              </button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
};

export default Videos;
