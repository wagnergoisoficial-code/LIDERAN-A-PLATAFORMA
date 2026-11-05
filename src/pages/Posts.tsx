import React, { useState, useEffect, useRef } from 'react';
import { api } from '../services/api';
import { useAuth } from '../context/AuthContext';
import ImageUploadInput from '../components/ImageUploadInput';
import PageHeader from '../components/PageHeader';
import { celebrate } from '../lib/motion';
import UIkit from 'uikit';

// Enquetes da comunidade (apenas líderes)
const PollForm = () => {
  const [question, setQuestion] = useState('');
  const [options, setOptions] = useState(['', '']);
  const [expiresAt, setExpiresAt] = useState('');
  const [saving, setSaving] = useState(false);
  const submitRef = useRef<HTMLButtonElement>(null);

  const setOption = (i: number, value: string) => setOptions(prev => prev.map((o, idx) => idx === i ? value : o));

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    try {
      const res = await api.createPoll({
        question,
        options: options.filter(o => o.trim()),
        expiresAt: expiresAt ? new Date(`${expiresAt}T23:59:59`).toISOString() : null,
      });
      if (res.success) {
        celebrate(submitRef.current);
        setQuestion('');
        setOptions(['', '']);
        setExpiresAt('');
        UIkit.notification({ message: 'Enquete publicada no feed!', status: 'success' });
      }
    } catch (err: any) {
      UIkit.notification({ message: err.message || 'Erro ao criar enquete', status: 'danger' });
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="card" style={{ marginTop: '16px' }}>
      <div className="card-header">
        <span className="card-title">Nova Enquete</span>
      </div>
      <div className="card-body">
        <form onSubmit={handleSubmit}>
          <div className="uk-margin">
            <label className="uk-form-label">Pergunta</label>
            <input className="uk-input" placeholder="Ex: Qual o melhor dia para o ensaio?" value={question} onChange={e => setQuestion(e.target.value)} required />
          </div>
          <label className="uk-form-label">Opções</label>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', marginTop: '6px' }}>
            {options.map((opt, i) => (
              <div key={i} style={{ display: 'flex', gap: '8px' }}>
                <input className="uk-input" placeholder={`Opção ${i + 1}`} value={opt} onChange={e => setOption(i, e.target.value)} />
                {options.length > 2 && (
                  <button type="button" className="icon-btn" title="Remover opção" onClick={() => setOptions(prev => prev.filter((_, idx) => idx !== i))}>
                    <span uk-icon="icon: close; ratio: 0.75"></span>
                  </button>
                )}
              </div>
            ))}
          </div>
          {options.length < 6 && (
            <button type="button" className="link-btn" style={{ marginTop: '10px' }} onClick={() => setOptions(prev => [...prev, ''])}>
              + Adicionar opção
            </button>
          )}
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', gap: '12px', marginTop: '16px', flexWrap: 'wrap' }}>
            <div>
              <label className="uk-form-label">Encerra em (opcional)</label>
              <input className="uk-input" type="date" value={expiresAt} min={new Date().toISOString().slice(0, 10)} onChange={e => setExpiresAt(e.target.value)} style={{ width: '180px' }} />
            </div>
            <button ref={submitRef} className="uk-button uk-button-primary" type="submit" disabled={saving || !question.trim() || options.filter(o => o.trim()).length < 2} style={{ height: '36px' }}>
              {saving ? <><span uk-spinner="ratio: 0.5"></span> Publicando...</> : <><span uk-icon="icon: list; ratio: 0.85"></span> Publicar Enquete</>}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

const Posts = () => {
  const { user } = useAuth();
  const isLeader = user?.role === 'leader' || user?.role === 'admin';
  const [newPostContent, setNewPostContent] = useState('');
  const [selectedImage, setSelectedImage] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [recentPosts, setRecentPosts] = useState<any[]>([]);
  const publishRef = useRef<HTMLButtonElement>(null);
  // Doação: aparece no feed de todas as comunidades, com o local para buscar
  const [kind, setKind] = useState<'post' | 'donation'>('post');
  const [place, setPlace] = useState('');
  const [coords, setCoords] = useState<{ latitude: number; longitude: number } | null>(null);
  const [locating, setLocating] = useState(false);
  const donation = kind === 'donation';

  const useMyLocation = () => {
    if (!navigator.geolocation) {
      UIkit.notification({ message: 'Este navegador não dá a localização', status: 'danger' });
      return;
    }
    setLocating(true);
    navigator.geolocation.getCurrentPosition(
      pos => {
        setCoords({ latitude: Number(pos.coords.latitude.toFixed(5)), longitude: Number(pos.coords.longitude.toFixed(5)) });
        setLocating(false);
      },
      () => {
        UIkit.notification({ message: 'Não foi possível obter a localização. Autorize o acesso no navegador.', status: 'danger' });
        setLocating(false);
      },
      { enableHighAccuracy: true, timeout: 15000 },
    );
  };

  useEffect(() => { loadRecentPosts(); }, []);

  const loadRecentPosts = async () => {
    try {
      const result = await api.getPosts();
      if (result.success) setRecentPosts(result.data.filter((p: any) => p.userId === user?.id));
    } catch (err: any) {
      console.error('Erro ao carregar posts', err);
    }
  };

  const handleImageSelect = (file: File | null) => {
    setSelectedImage(file);
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => setImagePreview(reader.result as string);
      reader.readAsDataURL(file);
    } else {
      setImagePreview(null);
    }
  };

  const handleCreatePost = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newPostContent.trim() && !selectedImage) {
      UIkit.notification({ message: 'Escreva algo ou selecione uma imagem', status: 'warning' });
      return;
    }
    setLoading(true);
    try {
      const data = donation
        ? { content: newPostContent, type: 'donation', location: place, ...(coords || {}) }
        : { content: newPostContent };
      const result = await api.createPost(data, selectedImage || undefined);
      if (result.success) {
        celebrate(publishRef.current);
        setNewPostContent('');
        setSelectedImage(null);
        setImagePreview(null);
        setPlace('');
        setCoords(null);
        await loadRecentPosts();
        UIkit.notification({ message: donation ? 'Doação publicada para todas as comunidades!' : 'Post publicado com sucesso!', status: 'success' });
      }
    } catch (err: any) {
      UIkit.notification({ message: err.message || 'Erro ao publicar post', status: 'danger' });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div>
      {/* Page header */}
      <PageHeader icon="pencil" title="Criar Post" subtitle="Compartilhe sua fé e inspirações com a comunidade" />

      <div className="uk-grid uk-grid-medium" uk-grid="">
        {/* Form */}
        <div className="uk-width-2-3@m">
          <div className="card">
            <div className="card-header">
              <span className="card-title">Nova Publicação</span>
            </div>

            <div className="card-body">
              <form onSubmit={handleCreatePost}>
                <div className="guardian-mode" role="radiogroup" aria-label="Tipo de publicação" style={{ marginBottom: '14px' }}>
                  {([['post', 'Publicação'], ['donation', 'Doação']] as const).map(([value, label]) => (
                    <label key={value} className={kind === value ? 'is-selected' : ''}>
                      <input type="radio" name="post-kind" value={value} checked={kind === value} onChange={() => setKind(value)} />
                      {label}
                    </label>
                  ))}
                </div>

                <div className="uk-margin">
                  <label className="uk-form-label">{donation ? 'O que está a doar' : 'Mensagem'}</label>
                  <textarea
                    className="uk-textarea"
                    rows={5}
                    placeholder={donation ? 'Ex.: sofá de 3 lugares em bom estado. Diga como combinar a entrega.' : 'O que está acontecendo na sua caminhada com Deus?'}
                    value={newPostContent}
                    onChange={(e) => setNewPostContent(e.target.value)}
                  ></textarea>
                </div>

                {donation && (
                  <div className="uk-margin">
                    <label className="uk-form-label" htmlFor="donation-place">Onde buscar *</label>
                    <input id="donation-place" className="uk-input" type="text" maxLength={200} required
                      placeholder="Bairro, cidade ou ponto de referência" value={place} onChange={e => setPlace(e.target.value)} />
                    <div className="protection-row" style={{ marginTop: '8px' }}>
                      {coords ? (
                        <>
                          <span style={{ fontSize: '12px', color: 'var(--text-muted)' }}>
                            <span uk-icon="icon: location; ratio: 0.7"></span> Localização GPS guardada
                          </span>
                          <a href={`https://www.google.com/maps/search/?api=1&query=${coords.latitude},${coords.longitude}`} target="_blank" rel="noreferrer" style={{ fontSize: '12px' }}>Ver no mapa</a>
                          <button type="button" className="uk-button uk-button-default uk-button-small" onClick={() => setCoords(null)}>Remover</button>
                        </>
                      ) : (
                        <button type="button" className="uk-button uk-button-default uk-button-small" onClick={useMyLocation} disabled={locating}>
                          <span uk-icon="icon: location; ratio: 0.75"></span> {locating ? 'A obter a localização...' : 'Usar a minha localização'}
                        </button>
                      )}
                    </div>
                    <p style={{ margin: '6px 0 0', fontSize: '12px', color: 'var(--text-faint)' }}>
                      A doação e o local ficam visíveis para todas as comunidades. Partilhe só o que se sentir confortável.
                    </p>
                  </div>
                )}

                <ImageUploadInput onImageSelect={handleImageSelect} imagePreview={imagePreview} />

                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '20px' }}>
                  <span style={{ fontSize: '12px', color: 'var(--text-faint)', display: 'flex', alignItems: 'center', gap: '5px' }}>
                    <span uk-icon={`icon: ${donation ? 'world' : 'users'}; ratio: 0.8`}></span>
                    {donation ? 'Visível para todas as comunidades' : 'Visível para toda a comunidade'}
                  </span>
                  <button
                    ref={publishRef}
                    className="uk-button uk-button-primary"
                    type="submit"
                    disabled={loading || (!newPostContent.trim() && !selectedImage) || (donation && place.trim().length < 3)}
                    style={{ height: '36px' }}
                  >
                    {loading
                      ? <><span uk-spinner="ratio: 0.5"></span> Publicando...</>
                      : <><span uk-icon="icon: push; ratio: 0.85"></span> Publicar</>
                    }
                  </button>
                </div>
              </form>
            </div>
          </div>

          {isLeader && <PollForm />}

          {/* Recent posts notice */}
          {recentPosts.length > 0 && (
            <div className="card" style={{ marginTop: '16px', background: 'var(--bg-surface)', padding: '14px 20px', display: 'flex', alignItems: 'center', gap: '10px' }}>
              <span uk-icon="icon: check; ratio: 0.9" style={{ flexShrink: 0 }}></span>
              <span style={{ fontSize: '13px', color: 'var(--text-muted)' }}>
                Suas publicações recentes estão no feed.
              </span>
            </div>
          )}
        </div>

        {/* Sidebar tips */}
        <div className="uk-width-1-3@m">
          <div className="card" uk-sticky="offset: 72">
            <div className="card-header">
              <span className="card-title">Dicas de Post</span>
            </div>
            <div style={{ padding: '16px 20px' }}>
              {[
                { icon: 'heart', text: 'Seja autêntico e compartilhe suas experiências' },
                { icon: 'image', text: 'Use imagens que transmitam sua mensagem' },
                { icon: 'users', text: 'Respeite os outros membros da comunidade' },
                { icon: 'star', text: 'Compartilhe mensagens inspiradoras e edificantes' },
              ].map(({ icon, text }, i) => (
                <div key={i} style={{ display: 'flex', alignItems: 'flex-start', gap: '10px', marginBottom: i < 3 ? '14px' : 0 }}>
                  <span uk-icon={`icon: ${icon}; ratio: 0.85`} style={{ flexShrink: 0, marginTop: '1px' }}></span>
                  <span style={{ fontSize: '12px', color: 'var(--text-muted)', lineHeight: 1.5 }}>{text}</span>
                </div>
              ))}
            </div>
            <div style={{ padding: '12px 20px', borderTop: '1px solid var(--border)' }}>
              <p style={{ margin: 0, fontSize: '12px', color: 'var(--text-faint)', lineHeight: 1.5 }}>
                Seus posts aparecem no Feed e podem receber comentários da comunidade.
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Posts;
