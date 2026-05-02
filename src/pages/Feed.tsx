import React, { useState, useEffect } from 'react';
import { api } from '../services/api';
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
  _count?: {
    likes?: number;
  };
}

const Feed = () => {
  const [posts, setPosts] = useState<Post[]>([]);
  const [loadingPosts, setLoadingPosts] = useState(true);
  const [likedPosts, setLikedPosts] = useState<Set<string>>(new Set());

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
      console.error('Erro ao carregar posts:', err);
      setPosts([]);
    } finally {
      setLoadingPosts(false);
    }
  };

  const handleLike = (postId: string): void => {
    setLikedPosts((prev: Set<string>) => {
      const newSet = new Set(prev);
      if (newSet.has(postId)) {
        newSet.delete(postId);
      } else {
        newSet.add(postId);
      }
      return newSet;
    });
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
      <div className="uk-width-2-3@m">
        <div style={{
          background: 'white',
          padding: '24px',
          borderRadius: '12px',
          boxShadow: '0 1px 3px rgba(0, 0, 0, 0.08)',
          marginBottom: '24px'
        }}>
          <h1 className="uk-heading-small uk-margin-remove-top">📰 Feed da Comunidade</h1>
          <p className="uk-text-muted uk-margin-small-bottom">Veja as mensagens e inspirações compartilhadas pela comunidade</p>
        </div>

        {loadingPosts ? (
          <div className="uk-text-center uk-margin-large-top">
            <span uk-spinner="ratio: 2"></span>
          </div>
        ) : posts.length === 0 ? (
          <div style={{
            background: 'white',
            padding: '48px 24px',
            borderRadius: '12px',
            boxShadow: '0 1px 3px rgba(0, 0, 0, 0.08)',
            textAlign: 'center'
          }}>
            <div style={{ fontSize: '48px', marginBottom: '16px' }}>📝</div>
            <p style={{ fontSize: '16px', color: '#6c757d', margin: '0' }}>Nenhum post compartilhado ainda</p>
            <p style={{ fontSize: '14px', color: '#adb5bd', margin: '8px 0 0 0' }}>Seja o primeiro a compartilhar algo inspirador!</p>
          </div>
        ) : (
          posts.map((post: Post) => (
            <PostCard 
              post={post} 
              onComment={handleAddComment}
              onLike={() => handleLike(post.id)}
              isLiked={likedPosts.has(post.id)}
            />
          ))
        )}
      </div>

      <div className="uk-width-1-3@m uk-visible@m">
        <div style={{
          background: 'white',
          padding: '20px',
          borderRadius: '12px',
          boxShadow: '0 1px 3px rgba(0, 0, 0, 0.08)',
          position: 'sticky',
          top: '100px'
        }} uk-sticky="offset: 100">
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

interface PostCardProps {
  post: Post;
  onComment: (id: string, content: string) => void;
  onLike: () => void;
  isLiked: boolean;
}

const PostCard = ({ post, onComment, onLike, isLiked }: PostCardProps) => {
  const [commentText, setCommentText] = useState('');
  const [showComments, setShowComments] = useState(false);

  const submitComment = (e: React.FormEvent) => {
    e.preventDefault();
    if (!commentText.trim()) return;
    onComment(post.id, commentText);
    setCommentText('');
  };

  return (
    <div style={{
      background: 'white',
      borderRadius: '12px',
      boxShadow: '0 2px 8px rgba(0, 0, 0, 0.1)',
      overflow: 'hidden',
      marginBottom: '24px',
      transition: 'box-shadow 0.3s ease'
    }}
    onMouseEnter={(e) => {
      e.currentTarget.style.boxShadow = '0 4px 16px rgba(0, 0, 0, 0.15)';
    }}
    onMouseLeave={(e) => {
      e.currentTarget.style.boxShadow = '0 2px 8px rgba(0, 0, 0, 0.1)';
    }}>
      
      {/* Header com usuário */}
      <div style={{ padding: '16px 20px', borderBottom: '1px solid #f0f0f0' }}>
        <div className="uk-flex uk-flex-middle">
          <div className="uk-width-auto uk-margin-small-right">
            <span className="uk-icon-button" uk-icon="user"></span>
          </div>
          <div className="uk-width-expand">
            <h5 style={{ margin: 0, fontWeight: 600, fontSize: '14px' }}>{post.userName}</h5>
            <p style={{ margin: '2px 0 0 0', fontSize: '12px', color: '#999' }}>
              <time dateTime={post.createdAt}>{new Date(post.createdAt).toLocaleDateString('pt-BR', { day: 'numeric', month: 'short', year: 'numeric' })}</time>
            </p>
          </div>
        </div>
      </div>

      {/* Imagem com Overlay de Texto */}
      {post.imageUrl && (
        <div style={{ position: 'relative', height: '300px', overflow: 'hidden', background: '#f5f5f5' }}>
          <img 
            src={post.imageUrl} 
            alt="Post content" 
            style={{
              width: '100%',
              height: '100%',
              objectFit: 'cover',
              display: 'block'
            }}
          />
          {post.content && (
            <div style={{
              position: 'absolute',
              bottom: 0,
              left: 0,
              right: 0,
              background: 'linear-gradient(to top, rgba(0,0,0,0.8), rgba(0,0,0,0.4), transparent)',
              padding: '24px 20px 16px',
              color: 'white',
              fontSize: '15px',
              lineHeight: '1.4'
            }}>
              {post.content}
            </div>
          )}
        </div>
      )}

      {/* Texto sem Imagem */}
      {!post.imageUrl && post.content && (
        <div style={{ padding: '20px' }}>
          <p style={{ margin: 0, fontSize: '15px', lineHeight: '1.5', color: '#333' }}>
            {post.content}
          </p>
        </div>
      )}

      {/* Ícones - Curtir e Comentar */}
      <div style={{
        padding: '12px 20px',
        display: 'flex',
        gap: '16px',
        borderTop: '1px solid #f0f0f0',
        borderBottom: post.comments.length > 0 ? '1px solid #f0f0f0' : 'none'
      }}>
        <button 
          onClick={onLike}
          style={{
            background: 'none',
            border: 'none',
            padding: '8px',
            cursor: 'pointer',
            color: isLiked ? '#e74c3c' : '#999',
            fontSize: '20px',
            lineHeight: 1,
            display: 'flex',
            alignItems: 'center',
            transition: 'color 0.2s ease'
          }}
          title="Curtir"
        >
          <span uk-icon={`icon: heart; ratio: 1`}></span>
        </button>
        
        {post.comments.length > 0 && (
          <button 
            onClick={() => setShowComments(!showComments)}
            style={{
              background: 'none',
              border: 'none',
              padding: '8px',
              cursor: 'pointer',
              color: '#999',
              fontSize: '16px',
              marginLeft: 'auto',
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
              transition: 'color 0.2s ease'
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.color = '#1e87f0';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.color = '#999';
            }}
          >
            <span uk-icon="icon: chat; ratio: 0.9"></span>
            {post.comments.length} {showComments ? '▼' : '▶'}
          </button>
        )}
      </div>

      {/* Comentários - Expandível */}
      {post.comments.length > 0 && showComments && (
        <div style={{ padding: '12px 20px', background: '#fafafa', maxHeight: '400px', overflowY: 'auto' }}>
          <ul style={{ listStyle: 'none', padding: 0, margin: 0 }}>
            {post.comments.map((comment) => (
              <li key={comment.id} style={{ marginBottom: '12px', paddingBottom: '12px', borderBottom: '1px solid #eee' }}>
                <div style={{ display: 'flex', gap: '10px' }}>
                  <div style={{ flexShrink: 0 }}>
                    <span className="uk-icon-button" uk-icon="icon: user; ratio: 0.8"></span>
                  </div>
                  <div style={{ flex: 1 }}>
                    <span style={{ fontWeight: 600, fontSize: '13px', color: '#333' }}>{comment.userName}</span>
                    <p style={{ margin: '4px 0 0 0', fontSize: '13px', color: '#555' }}>{comment.content}</p>
                    <time style={{ fontSize: '11px', color: '#999' }}>
                      {new Date(comment.createdAt).toLocaleDateString('pt-BR', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })}
                    </time>
                  </div>
                </div>
              </li>
            ))}
          </ul>
        </div>
      )}

      {/* Campo de Comentário */}
      <form onSubmit={submitComment} style={{ padding: '16px 20px', borderTop: '1px solid #f0f0f0' }}>
        <div style={{ display: 'flex', gap: '8px' }}>
          <input 
            type="text"
            placeholder="Escreva um comentário..."
            value={commentText}
            onChange={(e) => setCommentText(e.target.value)}
            style={{
              flex: 1,
              padding: '10px 12px',
              border: '1px solid #ddd',
              borderRadius: '20px',
              fontSize: '13px',
              fontFamily: 'inherit',
              outline: 'none'
            }}
            onFocus={(e) => {
              e.target.style.borderColor = '#1e87f0';
              e.target.style.boxShadow = '0 0 0 3px rgba(30, 135, 240, 0.1)';
            }}
            onBlur={(e) => {
              e.target.style.borderColor = '#ddd';
              e.target.style.boxShadow = 'none';
            }}
          />
          <button 
            type="submit"
            style={{
              padding: '8px 16px',
              background: '#1e87f0',
              color: 'white',
              border: 'none',
              borderRadius: '20px',
              cursor: 'pointer',
              fontSize: '13px',
              fontWeight: 500,
              transition: 'background 0.2s ease'
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.background = '#0a6ecf';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.background = '#1e87f0';
            }}
          >
            Enviar
          </button>
        </div>
      </form>
    </div>
  );
};

export default Feed;
