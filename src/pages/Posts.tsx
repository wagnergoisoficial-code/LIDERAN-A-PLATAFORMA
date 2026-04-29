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

  useEffect(() => {
    loadRecentPosts();
  }, []);

  const loadRecentPosts = async () => {
    try {
      const result = await api.getPosts();
      if (result.success) {
        // Get only the last 3 posts for preview
        setRecentPosts(result.data.slice(0, 3));
      }
    } catch (err: any) {
      console.error('Erro ao carregar posts', err);
    }
  };

  const handleImageSelect = (file: File | null) => {
    setSelectedImage(file);

    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        setImagePreview(reader.result as string);
      };
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
    <div className="uk-container uk-margin-large-top">
      <div className="uk-grid uk-grid-medium" uk-grid="">
        {/* Create Post Section */}
        <div className="uk-width-2-3@m">
          <div className="uk-card uk-card-default uk-card-body uk-margin-bottom">
            <h2 className="uk-card-title uk-margin-remove-top">Criar Novo Post</h2>
            <hr />
            
            <form onSubmit={handleCreatePost}>
              <div className="uk-margin">
                <label className="uk-form-label">Mensagem</label>
                <textarea 
                  className="uk-textarea uk-border-rounded" 
                  rows={5} 
                  placeholder="O que está acontecendo na sua caminhada com Deus?"
                  value={newPostContent}
                  onChange={(e) => setNewPostContent(e.target.value)}
                ></textarea>
              </div>

              {/* Image Upload Component */}
              <ImageUploadInput 
                onImageSelect={handleImageSelect}
                imagePreview={imagePreview}
              />

              <div className="uk-flex uk-flex-between uk-flex-middle uk-margin-top">
                <p className="uk-text-small uk-text-muted uk-margin-remove">
                  ✓ Compartilhe sua fé e inspiração com a comunidade
                </p>
                <button 
                  className="uk-button uk-button-primary uk-border-rounded" 
                  type="submit"
                  disabled={loading || (!newPostContent.trim() && !selectedImage)}
                >
                  {loading ? (
                    <>
                      <span uk-spinner="ratio: 0.6"></span> Publicando...
                    </>
                  ) : 'Publicar Post'}
                </button>
              </div>
            </form>
          </div>

          {/* Recent Posts Preview */}
          {recentPosts.length > 0 && (
            <div className="uk-card uk-card-default uk-card-body">
              <h3 className="uk-card-title">Posts Recentes</h3>
              <p className="uk-text-small uk-text-muted">
                Você tem {recentPosts.length} posts no feed. Acesse a página Feed para ver todos!
              </p>
            </div>
          )}
        </div>

        {/* Info Sidebar */}
        <div className="uk-width-1-3@m">
          <div className="uk-card uk-card-default uk-card-body" uk-sticky="offset: 100">
            <h4 className="uk-text-bold">📝 Dicas para Bons Posts</h4>
            <ul className="uk-list uk-list-bullet">
              <li className="uk-text-small uk-margin-small-bottom">
                Seja autêntico e compartilhe suas experiências
              </li>
              <li className="uk-text-small uk-margin-small-bottom">
                Use imagens que transmitam sua mensagem
              </li>
              <li className="uk-text-small uk-margin-small-bottom">
                Respeite os outros membros da comunidade
              </li>
              <li className="uk-text-small uk-margin-small-bottom">
                Compartilhe mensagens inspiradoras e edificantes
              </li>
            </ul>
            <hr />
            <p className="uk-text-small uk-text-muted">
              Seus posts aparecerão no Feed e poderão receber comentários e reações da comunidade.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Posts;
