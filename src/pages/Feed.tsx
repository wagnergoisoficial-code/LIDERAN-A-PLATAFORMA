import React, { useState, useEffect } from 'react';
import { api } from '../services/api';
import ImageUploadInput from '../components/ImageUploadInput';
import UIkit from 'uikit';

interface Comment {
  id: string;
  content: string;
  userName: string;
  createdAt: string;
}

interface Post {
  id: string;
  content: string;
  imageUrl?: string;
  userName: string;
  createdAt: string;
  comments: Comment[];
}

const Feed = () => {
  const [posts, setPosts] = useState<Post[]>([]);
  const [newPostContent, setNewPostContent] = useState('');
  const [selectedImage, setSelectedImage] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [loadingPosts, setLoadingPosts] = useState(true);

  useEffect(() => {
    loadPosts();
  }, []);

  const loadPosts = async () => {
    try {
      const result = await api.getPosts();
      if (result.success) {
        setPosts(result.data);
      }
    } catch (err: any) {
      UIkit.notification({ message: 'Erro ao carregar posts', status: 'danger' });
    } finally {
      setLoadingPosts(false);
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
        await loadPosts();
        UIkit.notification({ message: 'Post publicado!', status: 'success' });
      }
    } catch (err: any) {
      UIkit.notification({ message: err.message || 'Erro ao publicar post', status: 'danger' });
    } finally {
      setLoading(false);
    }
  };

  const handleAddComment = async (postId: string, content: string) => {
    try {
      const result = await api.addComment(postId, { content });
      if (result.success) {
        await loadPosts();
        UIkit.notification({ message: 'Comentário adicionado!', status: 'success' });
      }
    } catch (err: any) {
      UIkit.notification({ message: 'Erro ao comentar', status: 'danger' });
    }
  };

  return (
    <div className="uk-grid uk-grid-medium" uk-grid="">
      <div className="uk-width-expand@m">
        <div className="uk-card uk-card-default uk-card-body uk-margin-bottom">
          <form onSubmit={handleCreatePost}>
            <div className="uk-margin">
              <textarea 
                className="uk-textarea uk-border-rounded" 
                rows={3} 
                placeholder="O que está acontecendo na sua caminhada com Deus?"
                value={newPostContent}
                onChange={(e) => setNewPostContent(e.target.value)}
              ></textarea>
            </div>

            <ImageUploadInput 
              onImageSelect={handleImageSelect}
              imagePreview={imagePreview}
            />

            <div className="uk-flex uk-flex-right">
              <button 
                className="uk-button uk-button-primary uk-border-rounded" 
                type="submit"
                disabled={loading || (!newPostContent.trim() && !selectedImage)}
              >
                {loading ? <span uk-spinner="ratio: 0.6"></span> : 'Publicar'}
              </button>
            </div>
          </form>
        </div>

        {loadingPosts ? (
          <div className="uk-text-center uk-margin-large-top">
            <span uk-spinner="ratio: 2"></span>
          </div>
        ) : posts.length === 0 ? (
          <div className="uk-card uk-card-default uk-card-body uk-text-center">
            <p className="uk-text-muted">Nenhum post encontrado. Seja o primeiro a compartilhar!</p>
          </div>
        ) : (
          posts.map((post) => (
            <PostCard key={post.id} post={post} onComment={handleAddComment} />
          ))
        )}
      </div>

      <div className="uk-width-1-3@m uk-visible@m">
        <div className="uk-card uk-card-default uk-card-body" uk-sticky="offset: 100">
          <h4 className="uk-text-bold">Sugestões</h4>
          <p className="uk-text-small uk-text-muted">Conecte-se com outros jovens da igreja.</p>
          <hr />
          <ul className="uk-list uk-list-divider">
            <li className="uk-flex uk-flex-middle">
              <div className="uk-width-auto uk-margin-small-right">
                <span className="uk-icon-button" uk-icon="user"></span>
              </div>
              <div className="uk-width-expand">
                <span className="uk-text-bold uk-text-small">Pastor Anderson</span>
                <p className="uk-margin-remove-top uk-text-meta">Líder Regional</p>
              </div>
            </li>
            <li className="uk-flex uk-flex-middle">
              <div className="uk-width-auto uk-margin-small-right">
                <span className="uk-icon-button" uk-icon="user"></span>
              </div>
              <div className="uk-width-expand">
                <span className="uk-text-bold uk-text-small">Ministério de Música</span>
                <p className="uk-margin-remove-top uk-text-meta">Próximo ensaio amanhã</p>
              </div>
            </li>
          </ul>
        </div>
      </div>
    </div>
  );
};

const PostCard = ({ post, onComment }: { post: Post, onComment: (id: string, content: string) => void }) => {
  const [commentText, setCommentText] = useState('');

  const submitComment = (e: React.FormEvent) => {
    e.preventDefault();
    if (!commentText.trim()) return;
    onComment(post.id, commentText);
    setCommentText('');
  };

  return (
    <div className="uk-card uk-card-default uk-margin-bottom">
      <div className="uk-card-header uk-padding-small">
        <div className="uk-grid-small uk-flex-middle" uk-grid="">
          <div className="uk-width-auto">
            <span className="uk-icon-button" uk-icon="user"></span>
          </div>
          <div className="uk-width-expand">
            <h5 className="uk-card-title uk-margin-remove-bottom uk-text-bold uk-text-small">{post.userName}</h5>
            <p className="uk-text-meta uk-margin-remove-top">
              <time dateTime={post.createdAt}>{new Date(post.createdAt).toLocaleDateString('pt-BR', { day: 'numeric', month: 'short' })}</time>
            </p>
          </div>
        </div>
      </div>
      {post.imageUrl && (
        <div className="uk-card-media-top">
          <img 
            src={post.imageUrl} 
            alt="Post content" 
            style={{
              width: '100%',
              maxHeight: '400px',
              objectFit: 'cover',
              display: 'block'
            }}
          />
        </div>
      )}
      
      <div className="uk-card-body uk-padding-small">
        {post.content && (
          <p className="uk-text-default uk-margin-bottom">{post.content}</p>
        )}
      </div>
      <div className="uk-card-footer uk-padding-small">
        <div className="uk-grid-small" uk-grid="">
          <div className="uk-width-1-2">
            <button className="uk-button uk-button-text uk-text-muted" style={{ textTransform: 'none' }}>
              <span uk-icon="icon: heart; ratio: 0.8" className="uk-margin-small-right"></span>
              Curtir
            </button>
          </div>
          <div className="uk-width-1-2 uk-text-right">
             <span className="uk-text-meta">{post.comments.length} comentários</span>
          </div>
        </div>
        
        {post.comments.length > 0 && (
          <ul className="uk-list uk-list-divider uk-margin-small-top">
            {post.comments.map((comment) => (
              <li key={comment.id} className="uk-padding-small uk-padding-remove-horizontal">
                <div className="uk-flex">
                  <div className="uk-margin-small-right">
                    <span className="uk-icon-button" uk-icon="icon: user; ratio: 0.7"></span>
                  </div>
                  <div>
                    <span className="uk-text-bold uk-text-small">{comment.userName}</span>
                    <p className="uk-margin-remove uk-text-small">{comment.content}</p>
                    <time className="uk-text-meta" style={{ fontSize: '10px' }}>{new Date(comment.createdAt).toLocaleDateString()}</time>
                  </div>
                </div>
              </li>
            ))}
          </ul>
        )}

        <form onSubmit={submitComment} className="uk-margin-small-top">
          <div className="uk-grid-small" uk-grid="">
            <div className="uk-width-expand">
              <input 
                className="uk-input uk-form-small uk-border-rounded" 
                type="text" 
                placeholder="Escreva um comentário..."
                value={commentText}
                onChange={(e) => setCommentText(e.target.value)}
              />
            </div>
            <div className="uk-width-auto">
              <button type="submit" className="uk-button uk-button-primary uk-button-small uk-border-rounded">
                <span uk-icon="chevron-right"></span>
              </button>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
};

export default Feed;
