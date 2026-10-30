import React, { useState, useEffect } from 'react';
import { api } from '../services/api';
import ImageUploadInput from '../components/ImageUploadInput';
import UIkit from 'uikit';

const Posts = () => {
  const [newPostContent, setNewPostContent] = useState('');
  const [selectedImage, setSelectedImage] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [recentPosts, setRecentPosts] = useState<any[]>([]);

  useEffect(() => { loadRecentPosts(); }, []);

  const loadRecentPosts = async () => {
    try {
      const result = await api.getPosts();
      if (result.success) setRecentPosts(result.data.slice(0, 3));
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
      const result = await api.createPost({ content: newPostContent }, selectedImage || undefined);
      if (result.success) {
        setNewPostContent('');
        setSelectedImage(null);
        setImagePreview(null);
        await loadRecentPosts();
        UIkit.notification({ message: 'Post publicado com sucesso!', status: 'success' });
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
      <div style={{ marginBottom: '24px', paddingBottom: '16px', borderBottom: '1px solid var(--border)' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '4px' }}>
          <span uk-icon="icon: pencil; ratio: 1.1" style={{ color: 'var(--accent)' }}></span>
          <h2 style={{ margin: 0, fontSize: '20px', fontWeight: 700, letterSpacing: '-0.02em' }}>Criar Post</h2>
        </div>
        <p style={{ margin: 0, fontSize: '13px', color: 'var(--text-muted)' }}>
          Compartilhe sua fé e inspirações com a comunidade
        </p>
      </div>

      <div className="uk-grid uk-grid-medium" uk-grid="">
        {/* Form */}
        <div className="uk-width-2-3@m">
          <div style={{ border: '1px solid var(--border)', background: 'var(--bg)' }}>
            <div style={{ padding: '12px 20px', background: 'var(--bg-surface)', borderBottom: '1px solid var(--border)' }}>
              <span style={{ fontSize: '11px', fontWeight: 700, letterSpacing: '0.07em', textTransform: 'uppercase', color: 'var(--text-muted)' }}>
                Nova Publicação
              </span>
            </div>

            <div style={{ padding: '20px' }}>
              <form onSubmit={handleCreatePost}>
                <div className="uk-margin">
                  <label className="uk-form-label">Mensagem</label>
                  <textarea
                    className="uk-textarea"
                    rows={5}
                    placeholder="O que está acontecendo na sua caminhada com Deus?"
                    value={newPostContent}
                    onChange={(e) => setNewPostContent(e.target.value)}
                  ></textarea>
                </div>

                <ImageUploadInput onImageSelect={handleImageSelect} imagePreview={imagePreview} />

                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '20px' }}>
                  <span style={{ fontSize: '12px', color: 'var(--text-faint)', display: 'flex', alignItems: 'center', gap: '5px' }}>
                    <span uk-icon="icon: users; ratio: 0.8"></span>
                    Visível para toda a comunidade
                  </span>
                  <button
                    className="uk-button uk-button-primary"
                    type="submit"
                    disabled={loading || (!newPostContent.trim() && !selectedImage)}
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

          {/* Recent posts notice */}
          {recentPosts.length > 0 && (
            <div style={{ marginTop: '16px', border: '1px solid var(--border)', background: 'var(--bg-surface)', padding: '14px 20px', display: 'flex', alignItems: 'center', gap: '10px' }}>
              <span uk-icon="icon: check; ratio: 0.9" style={{ color: 'var(--success)', flexShrink: 0 }}></span>
              <span style={{ fontSize: '13px', color: 'var(--text-muted)' }}>
                Você tem <strong style={{ color: 'var(--text)' }}>{recentPosts.length}</strong> posts no feed.
              </span>
            </div>
          )}
        </div>

        {/* Sidebar tips */}
        <div className="uk-width-1-3@m">
          <div style={{ border: '1px solid var(--border)', background: 'var(--bg)' }} uk-sticky="offset: 72">
            <div style={{ padding: '12px 20px', background: 'var(--bg-surface)', borderBottom: '1px solid var(--border)' }}>
              <span style={{ fontSize: '11px', fontWeight: 700, letterSpacing: '0.07em', textTransform: 'uppercase', color: 'var(--text-muted)' }}>
                Dicas de Post
              </span>
            </div>
            <div style={{ padding: '16px 20px' }}>
              {[
                { icon: 'heart', text: 'Seja autêntico e compartilhe suas experiências' },
                { icon: 'image', text: 'Use imagens que transmitam sua mensagem' },
                { icon: 'users', text: 'Respeite os outros membros da comunidade' },
                { icon: 'star', text: 'Compartilhe mensagens inspiradoras e edificantes' },
              ].map(({ icon, text }, i) => (
                <div key={i} style={{ display: 'flex', alignItems: 'flex-start', gap: '10px', marginBottom: i < 3 ? '14px' : 0 }}>
                  <span uk-icon={`icon: ${icon}; ratio: 0.85`} style={{ color: 'var(--accent)', flexShrink: 0, marginTop: '1px' }}></span>
                  <span style={{ fontSize: '12px', color: 'var(--text-muted)', lineHeight: 1.5 }}>{text}</span>
                </div>
              ))}
            </div>
            <div style={{ padding: '12px 20px', borderTop: '1px solid var(--border)', background: 'var(--bg-surface)' }}>
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
