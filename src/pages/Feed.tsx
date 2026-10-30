import React, { useState, useEffect, useCallback } from 'react';
import { api } from '../services/api';
import { useAuth } from '../context/AuthContext';
import UIkit from 'uikit';
import Avatar from '../components/Avatar';
import PageHeader from '../components/PageHeader';
import EmptyState from '../components/EmptyState';

interface Comment {
  id: string; content: string; userId: string;
  userName: string; userProfileImage?: string; createdAt: string;
}
interface PostReactions { amen: number; praying: number; heart: number; fire: number; strong: number; }
const EMPTY_REACTIONS: PostReactions = { amen: 0, praying: 0, heart: 0, fire: 0, strong: 0 };
interface Post {
  id: string; content: string; imageUrl?: string;
  isPinned?: boolean; type?: string;
  userId?: string; userName: string; userProfileImage?: string;
  createdAt: string; comments: Comment[];
  reactions?: PostReactions; myReactions?: string[];
}
interface PollOption { id: string; text: string; votes: number; percentage: number; hasVoted: boolean; }
interface Poll { id: string; question: string; expiresAt?: string; createdBy: string; totalVotes: number; options: PollOption[]; myVoteOptionId: string | null; }
interface RankMember { userId: string; name: string; posts: number; comments: number; messages: number; total: number; percentage: number; }

const REACTION_CONFIG = [
  { type: 'amen',    icon: 'star',           label: 'Amém'    },
  { type: 'praying', icon: 'settings',       label: 'Orando'  },
  { type: 'heart',   icon: 'heart',          label: 'Amor'    },
  { type: 'fire',    icon: 'bolt',           label: 'Fogo'    },
  { type: 'strong',  icon: 'happy',          label: 'Forte'   },
];

const Feed = () => {
  const { user } = useAuth();
  const [posts, setPosts] = useState<Post[]>([]);
  const [polls, setPolls] = useState<Poll[]>([]);
  const [ranking, setRanking] = useState<RankMember[]>([]);
  const [loadingPosts, setLoadingPosts] = useState(true);

  const loadPosts = useCallback(async () => {
    try {
      const result = await api.getPosts();
      if (result.success) setPosts(result.data);
    } catch { setPosts([]); }
    finally { setLoadingPosts(false); }
  }, []);

  const loadPolls = useCallback(async () => {
    try {
      const res = await api.getPolls();
      if (res.success) setPolls(res.data.slice(0, 3));
    } catch { /* silent */ }
  }, []);

  const loadRanking = useCallback(async () => {
    if (!user?.churchId) return;
    try {
      const res = await api.getChurchMemberStats(user.churchId);
      if (res.success) setRanking((res.data || []).slice(0, 5));
    } catch { /* silent */ }
  }, [user?.churchId]);

  useEffect(() => { loadPosts(); loadPolls(); loadRanking(); }, [loadPosts, loadPolls, loadRanking]);

  const handleReact = async (postId: string, type: string, hasReacted: boolean) => {
    try {
      if (hasReacted) {
        await api.removeReaction(postId, type);
      } else {
        await api.reactToPost(postId, type);
      }
      setPosts(prev => prev.map(p => {
        if (p.id !== postId) return p;
        const newReactions = { ...(p.reactions ?? EMPTY_REACTIONS) };
        const currentMyReactions = p.myReactions ?? [];
        if (hasReacted) {
          newReactions[type as keyof PostReactions] = Math.max(0, newReactions[type as keyof PostReactions] - 1);
          return { ...p, reactions: newReactions, myReactions: currentMyReactions.filter(r => r !== type) };
        } else {
          newReactions[type as keyof PostReactions] += 1;
          return { ...p, reactions: newReactions, myReactions: [...currentMyReactions, type] };
        }
      }));
    } catch (err: any) {
      UIkit.notification({ message: err.message || 'Erro', status: 'danger', pos: 'top-right' });
    }
  };

  const handlePin = async (postId: string, isPinned: boolean) => {
    try {
      await api.pinPost(postId, !isPinned);
      setPosts(prev => prev.map(p => p.id === postId ? { ...p, isPinned: !isPinned } : p));
    } catch (err: any) {
      UIkit.notification({ message: err.message || 'Erro', status: 'danger', pos: 'top-right' });
    }
  };

  const handleAddComment = async (postId: string, content: string) => {
    try {
      const result = await api.addComment(postId, { content });
      if (result.success) {
        await loadPosts();
      }
    } catch {
      UIkit.notification({ message: 'Erro ao comentar', status: 'danger', pos: 'top-right' });
    }
  };

  const handleVotePoll = async (pollId: string, optionId: string) => {
    try {
      await api.votePoll(pollId, optionId);
      const res = await api.getPolls();
      if (res.success) setPolls(res.data.slice(0, 3));
    } catch (err: any) {
      UIkit.notification({ message: err.message || 'Erro', status: 'danger', pos: 'top-right' });
    }
  };

  const pinnedPosts = posts.filter(p => p.isPinned === true || p.type === 'announcement');
  const regularPosts = posts.filter(p => !p.isPinned && p.type !== 'announcement');

  return (
    <div className="uk-grid uk-grid-medium" uk-grid="">
      {/* Main feed */}
      <div className="uk-width-2-3@m">

        <PageHeader icon="rss" title="Feed da Comunidade" subtitle="Mensagens e inspirações compartilhadas pela comunidade" />

        {/* Pinned Announcements */}
        {pinnedPosts.length > 0 && (
          <div style={{ marginBottom: '24px' }}>
            <div className="list-label">Fixados</div>
            {pinnedPosts.map(post => (
              <PostCard key={post.id} post={post} currentUserId={user?.id || ''} userRole={user?.role || ''}
                onComment={handleAddComment} onReact={handleReact} onPin={handlePin} pinned />
            ))}
          </div>
        )}

        {/* Regular posts */}
        {loadingPosts ? (
          <div style={{ textAlign: 'center', padding: '60px 0' }}><span uk-spinner="ratio: 2"></span></div>
        ) : regularPosts.length === 0 && pinnedPosts.length === 0 ? (
          <EmptyState icon="pencil" title="Nenhum post ainda" text="Seja o primeiro a compartilhar algo inspirador" />
        ) : (
          regularPosts.map(post => (
            <PostCard key={post.id} post={post} currentUserId={user?.id || ''} userRole={user?.role || ''}
              onComment={handleAddComment} onReact={handleReact} onPin={handlePin} />
          ))
        )}
      </div>

      {/* Sidebar */}
      <div className="uk-width-1-3@m uk-visible@m">
        <div style={{ position: 'sticky', top: '72px', display: 'flex', flexDirection: 'column', gap: '16px' }}>

          {/* Weekly Ranking */}
          {ranking.length > 0 && (
            <div className="card">
              <div className="card-header">
                <span className="card-title">Ranking Semanal</span>
              </div>
              <div style={{ padding: '4px 0' }}>
                {ranking.map((m, i) => (
                  <div key={m.userId} style={{ display: 'flex', alignItems: 'center', gap: '10px', padding: '8px 16px' }}>
                    <span style={{ width: '18px', fontSize: '12px', fontWeight: 700, color: i === 0 ? 'var(--text)' : 'var(--text-faint)', textAlign: 'center', flexShrink: 0 }}>{i + 1}</span>
                    <Avatar name={m.name || '?'} size="small" />
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ fontSize: '13px', fontWeight: 600, color: 'var(--text)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{m.name}</div>
                      <div style={{ fontSize: '11px', color: 'var(--text-faint)' }}>{m.posts} posts · {m.comments} coments</div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Active Polls */}
          {polls.length > 0 && (
            <div className="card">
              <div className="card-header">
                <span className="card-title">Enquetes</span>
              </div>
              {polls.map(poll => (
                <PollWidget key={poll.id} poll={poll} onVote={handleVotePoll} />
              ))}
            </div>
          )}

          {/* Info */}
          {ranking.length === 0 && polls.length === 0 && (
            <div className="card">
              <div className="card-header">
                <span className="card-title">Comunidade</span>
              </div>
              <div style={{ padding: '8px 0' }}>
                <SuggestionItem icon="users" name="Bem-vindo!" subtitle="Explore a comunidade" />
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

const PollWidget = ({ poll, onVote }: { poll: Poll; onVote: (pollId: string, optionId: string) => void }) => {
  const hasVoted = poll.myVoteOptionId !== null;
  return (
    <div style={{ padding: '14px 16px', borderBottom: '1px solid var(--border)' }}>
      <p style={{ margin: '0 0 10px 0', fontSize: '13px', fontWeight: 600, color: 'var(--text)', lineHeight: 1.4 }}>{poll.question}</p>
      <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
        {poll.options.map(opt => (
          <div key={opt.id}>
            {hasVoted ? (
              <div style={{ position: 'relative', border: `1px solid ${opt.hasVoted ? 'var(--text-muted)' : 'var(--border)'}`, borderRadius: 'var(--radius-sm)', height: '30px', overflow: 'hidden' }}>
                <div style={{ position: 'absolute', top: 0, left: 0, bottom: 0, width: `${opt.percentage}%`, background: opt.hasVoted ? 'var(--border)' : 'var(--bg-elevated)', transition: 'width 400ms ease' }} />
                <div style={{ position: 'relative', display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '0 10px', height: '100%' }}>
                  <span style={{ fontSize: '12px', color: opt.hasVoted ? 'var(--text)' : 'var(--text-muted)', fontWeight: opt.hasVoted ? 700 : 400 }}>{opt.text}</span>
                  <span style={{ fontSize: '11px', color: 'var(--text-faint)', fontWeight: 600 }}>{opt.percentage}%</span>
                </div>
              </div>
            ) : (
              <button onClick={() => onVote(poll.id, opt.id)} style={{ width: '100%', height: '30px', border: '1px solid var(--border-strong)', borderRadius: 'var(--radius-sm)', background: 'transparent', fontSize: '12px', color: 'var(--text)', cursor: 'pointer', textAlign: 'left', padding: '0 10px', fontFamily: 'inherit' }}
                onMouseEnter={e => { e.currentTarget.style.borderColor = 'var(--text-muted)'; e.currentTarget.style.background = 'var(--bg-surface)'; }}
                onMouseLeave={e => { e.currentTarget.style.borderColor = 'var(--border-strong)'; e.currentTarget.style.background = 'transparent'; }}>
                {opt.text}
              </button>
            )}
          </div>
        ))}
      </div>
      <div style={{ marginTop: '8px', fontSize: '11px', color: 'var(--text-faint)' }}>{poll.totalVotes} voto{poll.totalVotes !== 1 ? 's' : ''}</div>
    </div>
  );
};

const SuggestionItem = ({ icon, name, subtitle }: { icon: string; name: string; subtitle: string }) => (
  <div style={{ display: 'flex', alignItems: 'center', gap: '12px', padding: '10px 20px' }}>
    <span uk-icon={`icon: ${icon}; ratio: 0.9`} style={{ color: 'var(--text)', flexShrink: 0 }}></span>
    <div>
      <div style={{ fontSize: '13px', fontWeight: 600, color: 'var(--text)' }}>{name}</div>
      <div style={{ fontSize: '12px', color: 'var(--text-faint)' }}>{subtitle}</div>
    </div>
  </div>
);

interface PostCardProps {
  post: Post; currentUserId: string; userRole: string;
  onComment: (id: string, content: string) => void;
  onReact: (postId: string, type: string, hasReacted: boolean) => void;
  onPin: (postId: string, isPinned: boolean) => void;
  pinned?: boolean;
}

const PostCard = ({ post, currentUserId, userRole, onComment, onReact, onPin, pinned }: PostCardProps) => {
  const [commentText, setCommentText] = useState('');
  const [showComments, setShowComments] = useState(false);
  const canPin = userRole === 'leader' || userRole === 'admin';
  const reactions = post.reactions ?? EMPTY_REACTIONS;
  const myReactions = post.myReactions ?? [];

  const submitComment = (e: React.FormEvent) => {
    e.preventDefault();
    if (!commentText.trim()) return;
    onComment(post.id, commentText);
    setCommentText('');
  };

  const totalReactions = Object.values(reactions).reduce((s, v) => s + v, 0);

  return (
    <div className="card" style={{ marginBottom: '16px', borderColor: pinned ? 'var(--border-strong)' : undefined }}>

      {/* Author row */}
      <div style={{ padding: '14px 16px', borderBottom: '1px solid var(--border)', display: 'flex', alignItems: 'center', gap: '10px' }}>
        <Avatar name={post.userName} profileImage={post.userProfileImage} size="small" />
        <div style={{ flex: 1 }}>
          <div style={{ fontSize: '13px', fontWeight: 600, color: 'var(--text)' }}>{post.userName}</div>
          <div style={{ fontSize: '11px', color: 'var(--text-faint)' }}>
            {new Date(post.createdAt).toLocaleDateString('pt-BR', { day: 'numeric', month: 'short', year: 'numeric' })}
          </div>
        </div>
        {canPin && (
          <button className={`action-btn${post.isPinned ? ' is-on' : ''}`} title={post.isPinned ? 'Desafixar' : 'Fixar'} onClick={() => onPin(post.id, post.isPinned)}>
            <span uk-icon="icon: bookmark; ratio: 0.8"></span>
          </button>
        )}
      </div>

      {/* Image */}
      {post.imageUrl && (
        <div style={{ position: 'relative', height: '280px', overflow: 'hidden', background: 'var(--bg-elevated)' }}>
          <img src={post.imageUrl} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }} />
          {post.content && (
            <div style={{ position: 'absolute', bottom: 0, left: 0, right: 0, background: 'linear-gradient(to top, rgba(0,0,0,0.75), transparent)', padding: '32px 16px 14px', color: '#fff', fontSize: '14px', lineHeight: 1.5 }}>
              {post.content}
            </div>
          )}
        </div>
      )}

      {/* Text content */}
      {!post.imageUrl && post.content && (
        <div style={{ padding: '16px', fontSize: '14px', lineHeight: 1.6, color: 'var(--text)' }}>{post.content}</div>
      )}

      {/* Reactions summary */}
      {totalReactions > 0 && (
        <div style={{ padding: '6px 16px', borderTop: '1px solid var(--border)', display: 'flex', gap: '10px' }}>
          {REACTION_CONFIG.filter(r => reactions[r.type as keyof PostReactions] > 0).map(r => (
            <span key={r.type} style={{ fontSize: '12px', color: 'var(--text-faint)', display: 'flex', alignItems: 'center', gap: '3px' }}>
              <span uk-icon={`icon: ${r.icon}; ratio: 0.7`}></span>
              {reactions[r.type as keyof PostReactions]}
            </span>
          ))}
        </div>
      )}

      {/* Reaction buttons */}
      <div style={{ padding: '6px 16px', display: 'flex', alignItems: 'center', gap: '2px', borderTop: '1px solid var(--border)', flexWrap: 'wrap' }}>
        {REACTION_CONFIG.map(r => {
          const hasReacted = myReactions.includes(r.type);
          return (
            <button key={r.type} onClick={() => onReact(post.id, r.type, hasReacted)}
              title={r.label}
              style={{ background: hasReacted ? 'var(--accent)' : 'none', border: `1px solid ${hasReacted ? 'var(--accent)' : 'transparent'}`, borderRadius: 'var(--radius-sm)', cursor: 'pointer', padding: '5px 9px', display: 'flex', alignItems: 'center', gap: '5px', color: hasReacted ? '#fff' : 'var(--text-muted)', fontSize: '12px', fontWeight: hasReacted ? 600 : 400, fontFamily: 'inherit', transition: 'all 120ms ease' }}
              onMouseEnter={e => { if (!hasReacted) { e.currentTarget.style.background = 'var(--bg-elevated)'; e.currentTarget.style.borderColor = 'var(--border)'; } }}
              onMouseLeave={e => { if (!hasReacted) { e.currentTarget.style.background = 'none'; e.currentTarget.style.borderColor = 'transparent'; } }}>
              <span uk-icon={`icon: ${r.icon}; ratio: 0.8`}></span>
              {r.label}
            </button>
          );
        })}

        {post.comments.length > 0 && (
          <button onClick={() => setShowComments(!showComments)}
            style={{ marginLeft: 'auto', background: 'none', border: 'none', cursor: 'pointer', padding: '5px 8px', display: 'flex', alignItems: 'center', gap: '5px', color: showComments ? 'var(--text)' : 'var(--text-muted)', fontSize: '12px', fontWeight: 500, fontFamily: 'inherit', transition: 'color 160ms ease' }}
            onMouseEnter={e => e.currentTarget.style.color = 'var(--text)'}
            onMouseLeave={e => { if (!showComments) e.currentTarget.style.color = 'var(--text-muted)'; }}>
            <span uk-icon="icon: comment; ratio: 0.9"></span>
            {post.comments.length} comentário{post.comments.length !== 1 ? 's' : ''}
          </button>
        )}
      </div>

      {/* Comments list */}
      {post.comments.length > 0 && showComments && (
        <div style={{ borderTop: '1px solid var(--border)', background: 'var(--bg-surface)', maxHeight: '320px', overflowY: 'auto' }}>
          {post.comments.map(comment => (
            <div key={comment.id} style={{ display: 'flex', gap: '10px', padding: '12px 16px', borderBottom: '1px solid var(--border)' }}>
              <Avatar name={comment.userName} profileImage={comment.userProfileImage} size="small" />
              <div style={{ flex: 1 }}>
                <div style={{ display: 'flex', alignItems: 'baseline', gap: '8px', marginBottom: '3px' }}>
                  <span style={{ fontSize: '13px', fontWeight: 600, color: 'var(--text)' }}>{comment.userName}</span>
                  <span style={{ fontSize: '11px', color: 'var(--text-faint)' }}>
                    {new Date(comment.createdAt).toLocaleDateString('pt-BR', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })}
                  </span>
                </div>
                <p style={{ margin: 0, fontSize: '13px', color: 'var(--text-muted)', lineHeight: 1.5 }}>{comment.content}</p>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Comment input */}
      <form onSubmit={submitComment} style={{ padding: '12px 16px', borderTop: '1px solid var(--border)', display: 'flex', gap: '8px' }}>
        <input type="text" className="uk-input" placeholder="Escreva um comentário..." value={commentText} onChange={e => setCommentText(e.target.value)}
          style={{ flex: 1 }} />
        <button type="submit" className="uk-button uk-button-primary">
          <span uk-icon="icon: reply; ratio: 0.8"></span>
          Enviar
        </button>
      </form>
    </div>
  );
};

export default Feed;
