import React, { useEffect, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { timeAgo, fullDate, plural, timeOnly, dayLabel } from '../lib/format';
import { youtubeThumbnail, youtubeEmbed, VIDEO_CATEGORIES } from '../lib/youtube';
import { pop, burst } from '../lib/motion';
import Avatar from './Avatar';
import Icon, { IconName } from './Icon';
import MoreMenu, { MenuAction } from './MoreMenu';
import AnimatedNumber from './AnimatedNumber';
import DateChip from './DateChip';
import { sendReport } from './ReportButton';

/* ─── Tipos do feed ─────────────────────────────────────────── */
export interface Comment { id: string; content: string; userId: string; userName: string; userProfileImage?: string; createdAt: string }
export interface PostReactions { amen: number; praying: number; heart: number; fire: number; strong: number }
export const EMPTY_REACTIONS: PostReactions = { amen: 0, praying: 0, heart: 0, fire: 0, strong: 0 };
export interface Post {
  id: string; content: string; imageUrl?: string;
  isPinned?: boolean; type?: string;
  churchId?: string; churchName?: string | null;
  location?: string | null; latitude?: number | null; longitude?: number | null; donatedAt?: string | null;
  userId?: string; userName: string; userProfileImage?: string;
  createdAt: string; comments: Comment[];
  reactions?: PostReactions; myReactions?: string[];
}
export interface Prayer {
  id: string; title: string; content: string; isAnswered: boolean;
  userId: string | null; prayCount: number; hasPrayed: boolean;
  authorName?: string | null; authorProfileImage?: string | null;
  isMine?: boolean; prayingNames?: string[]; createdAt: string;
}
export interface Devotional {
  id: string; title: string; content: string; verse?: string | null; createdAt: string;
  isActive: boolean; hoursRemaining: number; likeCount?: number; hasLiked?: boolean;
  user?: { id: string; name: string; profileImage?: string };
}
export interface Video {
  id: string; title: string; description?: string | null; category: keyof typeof VIDEO_CATEGORIES; sourceId: string;
  status: 'pending' | 'approved' | 'rejected'; reason?: string | null; createdAt: string;
  author: { id: string; name: string; profileImage?: string | null } | null;
  church: { id: string; name: string } | null;
}
export interface PollOption { id: string; text: string; votes: number; percentage: number; hasVoted: boolean }
export interface Poll {
  id: string; question: string; expiresAt?: string; createdBy: string; createdAt: string;
  totalVotes: number; options: PollOption[]; myVoteOptionId: string | null; isExpired?: boolean;
}
export interface EventItem {
  id: string; title: string; description?: string | null; location?: string | null;
  startDate: string; endDate?: string | null; createdBy: string; createdAt: string;
  goingCount: number; maybeCount: number; myStatus: string | null;
}
export interface Person { id: string; name: string; profileImage?: string | null }
export interface Me { id: string; name: string; role: string; churchId: string | null; profileImage?: string | null }

export const isPinnedPost = (p: Post) => p.isPinned === true || p.type === 'announcement';
const isManager = (me: Me) => me.role === 'leader' || me.role === 'admin';

/* ─── Partes comuns ─────────────────────────────────────────── */
interface ItemHeadProps {
  id: string;
  person: Person | null;
  // Perfil só para pessoas da mesma comunidade
  linkProfile: boolean;
  at: string;
  label?: { icon: IconName; text: string };
  extra?: React.ReactNode[];
  actions: MenuAction[];
  menuLabel: string;
}

const ItemHead: React.FC<ItemHeadProps> = ({ id, person, linkProfile, at, label, extra = [], actions, menuLabel }) => {
  const name = person?.name || 'Liderança da comunidade';
  const avatar = <Avatar name={name} profileImage={person?.profileImage} size={40} />;
  const profile = person && linkProfile ? `/profile/${person.id}` : null;
  return (
    <header className="post-head">
      {profile ? <Link to={profile} tabIndex={-1} aria-hidden="true">{avatar}</Link> : avatar}
      <div className="post-who">
        {profile
          ? <Link id={id} to={profile} className="post-author">{name}</Link>
          : <span id={id} className="post-author">{name}</span>}
        <div className="post-meta">
          <time className="post-meta-item" dateTime={at} title={fullDate(at)}>{timeAgo(at)}</time>
          {label && <span className="post-meta-item"><Icon name={label.icon} size={14} /> {label.text}</span>}
          {extra.filter(Boolean).map((item, i) => <span key={i} className="post-meta-item">{item}</span>)}
        </div>
      </div>
      <MoreMenu actions={actions} label={menuLabel} />
    </header>
  );
};

const LONG_TEXT = 420;

// Texto longo: mostra as primeiras linhas e "Ver mais"
const ItemText: React.FC<{ text?: string | null }> = ({ text }) => {
  const [expanded, setExpanded] = useState(false);
  if (!text) return null;
  const long = text.length > LONG_TEXT || text.split('\n').length > 7;
  return (
    <>
      <div className={`post-text${long && !expanded ? ' is-clamped' : ''}`}>{text}</div>
      {long && (
        <button type="button" className="link-btn post-more" onClick={() => setExpanded(v => !v)} aria-expanded={expanded}>
          {expanded ? 'Ver menos' : 'Ver mais'}
        </button>
      )}
    </>
  );
};

// Botão de reação com contagem (Amém, Orar...)
const Toggle: React.FC<{ on: boolean; icon: IconName; label: string; count?: number; showLabel?: boolean; onToggle: () => void }> = ({ on, icon, label, count = 0, showLabel, onToggle }) => (
  <button type="button" className={`reaction-btn${on ? ' is-on' : ''}`} aria-pressed={on} aria-label={`${label}${count ? `, ${count}` : ''}`} title={label}
    onClick={e => {
      if (!on) { pop(e.currentTarget); burst(e.currentTarget, { count: 6 }); }
      onToggle();
    }}>
    <Icon name={icon} size={20} />
    {showLabel && <span aria-hidden="true">{label}</span>}
    {count > 0 && <span className="reaction-count" aria-hidden="true"><AnimatedNumber value={count} /></span>}
  </button>
);

const useReport = (type: Parameters<typeof sendReport>[0], id: string): MenuAction => {
  const [sent, setSent] = useState(false);
  return { label: sent ? 'Denúncia enviada' : 'Denunciar', icon: 'flag', disabled: sent, onSelect: async () => setSent(await sendReport(type, id)) };
};

/* ─── Publicação e doação ───────────────────────────────────── */
const REACTIONS: { type: keyof PostReactions; icon: IconName; label: string }[] = [
  { type: 'amen', icon: 'amen', label: 'Amém' },
  { type: 'praying', icon: 'praying', label: 'Orando' },
  { type: 'heart', icon: 'heart', label: 'Amor' },
  { type: 'fire', icon: 'fire', label: 'Fogo' },
  { type: 'strong', icon: 'strong', label: 'Forte' },
];

interface PostCardProps {
  post: Post;
  me: Me;
  onDonated: (postId: string, donated: boolean) => void;
  onComment: (id: string, content: string) => Promise<boolean>;
  onReact: (postId: string, type: keyof PostReactions, hasReacted: boolean) => void;
  onPin: (postId: string, isPinned: boolean) => void;
  onDelete: (postId: string) => void;
  onDeleteComment: (postId: string, commentId: string) => void;
  onOpenImage: (src: string) => void;
}

export const PostCard: React.FC<PostCardProps> = ({ post, me, onComment, onReact, onPin, onDelete, onDeleteComment, onDonated, onOpenImage }) => {
  const [commentText, setCommentText] = useState('');
  const [sending, setSending] = useState(false);
  const [showComments, setShowComments] = useState(false);
  // Foto que já não existe no servidor: some, em vez de deixar uma caixa vazia
  const [imageFailed, setImageFailed] = useState(false);
  const commentInput = useRef<HTMLInputElement>(null);
  const focusComment = useRef(false);
  const report = useReport('post', post.id);

  const manager = isManager(me);
  const own = post.userId === me.id;
  const donation = post.type === 'donation';
  // Doação de outra comunidade: só para ver (pessoas de comunidades diferentes não conversam)
  const outside = donation && !!post.churchId && post.churchId !== me.churchId;
  const canPin = manager && !outside;
  const canDelete = own || (manager && (!outside || me.role === 'admin'));
  const canMarkDonated = donation && !outside && (own || manager);
  const mapUrl = post.latitude != null && post.longitude != null
    ? `https://www.google.com/maps/search/?api=1&query=${post.latitude},${post.longitude}`
    : null;
  const reactions = post.reactions ?? EMPTY_REACTIONS;
  const myReactions = post.myReactions ?? [];
  const commentsCount = post.comments.length;

  useEffect(() => {
    if (showComments && focusComment.current) {
      focusComment.current = false;
      commentInput.current?.focus();
    }
  }, [showComments]);

  const toggleComments = () => {
    focusComment.current = !showComments;
    setShowComments(v => !v);
  };

  const submitComment = async (e: React.FormEvent) => {
    e.preventDefault();
    const text = commentText.trim();
    if (!text || sending) return;
    setSending(true);
    // O texto só sai do campo se o comentário ficar gravado
    if (await onComment(post.id, text)) setCommentText('');
    setSending(false);
  };

  const actions: MenuAction[] = [];
  if (canPin) actions.push({ label: post.isPinned ? 'Desafixar' : 'Fixar no topo', icon: post.isPinned ? 'unpin' : 'pin', onSelect: () => onPin(post.id, !!post.isPinned) });
  if (!own) actions.push(report);
  if (canDelete) actions.push({ label: 'Excluir publicação', icon: 'trash', danger: true, onSelect: () => onDelete(post.id) });

  return (
    <article className="post" aria-labelledby={`post-${post.id}`}>
      <ItemHead
        id={`post-${post.id}`}
        person={post.userId ? { id: post.userId, name: post.userName, profileImage: post.userProfileImage } : null}
        linkProfile={!outside}
        at={post.createdAt}
        label={isPinnedPost(post) ? { icon: 'pin', text: 'Fixado' } : donation ? { icon: 'gift', text: post.donatedAt ? 'Já doado' : 'Doação' } : undefined}
        extra={[outside && post.churchName]}
        actions={actions}
        menuLabel="Opções da publicação"
      />

      <ItemText text={post.content} />

      {post.imageUrl && !imageFailed && (
        <button type="button" className="post-media" onClick={() => onOpenImage(post.imageUrl!)} aria-label="Ver a imagem em tamanho grande">
          <img src={post.imageUrl} alt="" loading="lazy" decoding="async" onError={() => setImageFailed(true)} />
        </button>
      )}

      {donation && (
        <div className="post-donation">
          <span className="post-donation-place">
            <Icon name="location" size={18} />
            <span>Buscar em <strong>{post.location}</strong></span>
          </span>
          <span className="post-donation-actions">
            {mapUrl && <a href={mapUrl} target="_blank" rel="noreferrer" style={{ fontWeight: 600 }}>Ver no mapa</a>}
            {canMarkDonated && (
              <button type="button" className={`uk-button uk-button-small ${post.donatedAt ? 'uk-button-default' : 'uk-button-success'}`}
                onClick={() => onDonated(post.id, !post.donatedAt)}>
                {post.donatedAt ? 'Voltar a disponível' : <><Icon name="check" size={16} /> Marcar como doado</>}
              </button>
            )}
          </span>
        </div>
      )}

      {outside ? (
        <p className="post-note">Doação de outra comunidade: pode ver e denunciar, mas não comentar.</p>
      ) : (
        <>
          <div className="post-actions">
            {REACTIONS.map(r => (
              <Toggle key={r.type} on={myReactions.includes(r.type)} icon={r.icon} label={r.label} count={reactions[r.type]}
                onToggle={() => onReact(post.id, r.type, myReactions.includes(r.type))} />
            ))}
            <button type="button" className={`reaction-btn comment-toggle${showComments ? ' is-on' : ''}`} onClick={toggleComments}
              aria-expanded={showComments} aria-controls={`comments-${post.id}`}
              aria-label={commentsCount ? plural(commentsCount, 'comentário', 'comentários') : 'Comentar'}>
              <Icon name="comment" size={20} />
              {commentsCount > 0 && <span className="reaction-count" aria-hidden="true"><AnimatedNumber value={commentsCount} /></span>}
              <span className="comment-toggle-label" aria-hidden="true">{commentsCount === 0 ? 'Comentar' : commentsCount === 1 ? 'comentário' : 'comentários'}</span>
            </button>
          </div>

          {showComments && (
            <section className="post-comments" id={`comments-${post.id}`} aria-label="Comentários">
              {commentsCount > 0 && (
                <div className="comment-list list-enter">
                  {post.comments.map(comment => (
                    <div key={comment.id} className="comment">
                      <Avatar name={comment.userName} profileImage={comment.userProfileImage} size={32} />
                      <div className="comment-body">
                        <div className="comment-head">
                          <Link to={`/profile/${comment.userId}`} className="comment-author">{comment.userName}</Link>
                          <time className="comment-time" dateTime={comment.createdAt} title={fullDate(comment.createdAt)}>{timeAgo(comment.createdAt)}</time>
                        </div>
                        <p className="comment-text">{comment.content}</p>
                      </div>
                      {(comment.userId === me.id || canPin) && (
                        <button type="button" className="action-btn" aria-label={`Excluir o comentário de ${comment.userName}`} title="Excluir comentário"
                          onClick={() => onDeleteComment(post.id, comment.id)}>
                          <Icon name="trash" size={16} />
                        </button>
                      )}
                    </div>
                  ))}
                </div>
              )}
              <form className="comment-form" onSubmit={submitComment}>
                <Avatar name={me.name} profileImage={me.profileImage} size={32} />
                <div className="comment-form-field">
                  <input ref={commentInput} type="text" aria-label="Escreva um comentário" placeholder="Escreva um comentário…"
                    value={commentText} onChange={e => setCommentText(e.target.value)} />
                  <button type="submit" className="action-btn comment-send" aria-label="Enviar comentário" disabled={!commentText.trim() || sending}>
                    <Icon name="send" size={18} />
                  </button>
                </div>
              </form>
            </section>
          )}
        </>
      )}
    </article>
  );
};

/* ─── Pedido de oração ──────────────────────────────────────── */
interface PrayerCardProps {
  prayer: Prayer;
  me: Me;
  onPray: (id: string, hasPrayed: boolean) => void;
  onAnswered: (id: string, origin?: DOMRect) => void;
  onDelete: (id: string) => void;
}

export const PrayerCard: React.FC<PrayerCardProps> = ({ prayer, me, onPray, onAnswered, onDelete }) => {
  const report = useReport('prayer_request', prayer.id);
  const article = useRef<HTMLElement>(null);
  const mine = !!prayer.isMine || prayer.userId === me.id;
  const canManage = mine || isManager(me);
  const actions: MenuAction[] = [];
  if (canManage && !prayer.isAnswered) actions.push({ label: 'Marcar como respondido', icon: 'check', onSelect: () => onAnswered(prayer.id, article.current?.getBoundingClientRect()) });
  if (!mine) actions.push(report);
  if (canManage) actions.push({ label: 'Excluir pedido', icon: 'trash', danger: true, onSelect: () => onDelete(prayer.id) });

  const names = prayer.prayingNames || [];
  const praying = names.length
    ? `${names.slice(0, 2).join(', ')}${prayer.prayCount > 2 ? ` e mais ${prayer.prayCount - 2}` : ''} ${prayer.prayCount === 1 ? 'está orando' : 'estão orando'}`
    : null;

  return (
    <article ref={article} className="post" aria-labelledby={`prayer-${prayer.id}`}>
      <ItemHead
        id={`prayer-${prayer.id}`}
        person={prayer.userId ? { id: prayer.userId, name: mine ? me.name : prayer.authorName || 'Membro', profileImage: prayer.authorProfileImage } : null}
        linkProfile
        at={prayer.createdAt}
        label={{ icon: 'praying', text: prayer.isAnswered ? 'Oração respondida' : 'Pedido de oração' }}
        actions={actions}
        menuLabel="Opções do pedido"
      />
      <h3 className="post-title">{prayer.title}</h3>
      <ItemText text={prayer.content} />
      {praying && <p className={`post-note${prayer.isAnswered ? '' : ' is-tight'}`}>{praying}</p>}
      {!prayer.isAnswered && (
        <div className="post-actions">
          <Toggle on={prayer.hasPrayed} icon="praying" label={prayer.hasPrayed ? 'Orando' : 'Orar'} count={prayer.prayCount} showLabel
            onToggle={() => onPray(prayer.id, prayer.hasPrayed)} />
        </div>
      )}
    </article>
  );
};

/* ─── Devocional ────────────────────────────────────────────── */
interface DevotionalCardProps {
  devotional: Devotional;
  me: Me;
  onLike: (id: string) => void;
  onRetire: (id: string) => void;
}

export const DevotionalCard: React.FC<DevotionalCardProps> = ({ devotional, me, onLike, onRetire }) => (
  <article className="post" aria-labelledby={`devotional-${devotional.id}`}>
    <ItemHead
      id={`devotional-${devotional.id}`}
      person={devotional.user || null}
      linkProfile
      at={devotional.createdAt}
      label={{ icon: 'book', text: 'Devocional de hoje' }}
      extra={[`${devotional.hoursRemaining} h restantes`]}
      actions={isManager(me) ? [{ label: 'Retirar do feed', icon: 'close', onSelect: () => onRetire(devotional.id) }] : []}
      menuLabel="Opções do devocional"
    />
    <h3 className="post-title">{devotional.title}</h3>
    {devotional.verse && <p className="verse">{devotional.verse}</p>}
    <ItemText text={devotional.content} />
    <div className="post-actions">
      <Toggle on={!!devotional.hasLiked} icon="heart" label="Amém" count={devotional.likeCount} showLabel onToggle={() => onLike(devotional.id)} />
    </div>
  </article>
);

/* ─── Vídeo ─────────────────────────────────────────────────── */
interface VideoCardProps {
  video: Video;
  me: Me;
  onReview: (video: Video, status: 'approved' | 'rejected') => void;
  onDelete: (video: Video) => void;
}

export const VideoCard: React.FC<VideoCardProps> = ({ video, me, onReview, onDelete }) => {
  const [playing, setPlaying] = useState(false);
  const report = useReport('video', video.id);
  const own = video.author?.id === me.id;
  const sameChurch = !!video.church && video.church.id === me.churchId;
  const leaderHere = isManager(me) && (sameChurch || me.role === 'admin');
  const canDelete = own || me.role === 'admin' || (me.role === 'leader' && sameChurch);
  const actions: MenuAction[] = [];
  if (video.status === 'approved' && !own) actions.push(report);
  if (canDelete) actions.push({ label: 'Apagar vídeo', icon: 'trash', danger: true, onSelect: () => onDelete(video) });

  return (
    <article className="post" aria-labelledby={`video-${video.id}`}>
      <ItemHead
        id={`video-${video.id}`}
        person={video.author}
        linkProfile={sameChurch}
        at={video.createdAt}
        label={{ icon: 'videos', text: VIDEO_CATEGORIES[video.category] || 'Vídeo' }}
        extra={[!sameChurch && video.church?.name]}
        actions={actions}
        menuLabel="Opções do vídeo"
      />
      <h3 className="post-title">{video.title}</h3>
      <ItemText text={video.description} />
      <div className="post-video">
        {playing ? (
          <iframe src={youtubeEmbed(video.sourceId)} title={video.title} allow="autoplay; encrypted-media; picture-in-picture; fullscreen" allowFullScreen />
        ) : (
          <button type="button" className="video-poster" onClick={() => setPlaying(true)} aria-label={`Ver o vídeo ${video.title}`}>
            <img src={youtubeThumbnail(video.sourceId)} alt="" loading="lazy" decoding="async" />
            <span className="play-badge"><Icon name="play" size={26} strokeWidth={2} /></span>
          </button>
        )}
      </div>

      {video.status === 'pending' && leaderHere && !own && (
        <div className="post-approval" role="group" aria-label="Aprovação do vídeo">
          <span>Aguarda sua aprovação para aparecer em todas as comunidades.</span>
          <span className="protection-row">
            <button type="button" className="uk-button uk-button-success uk-button-small" onClick={() => onReview(video, 'approved')}>
              <Icon name="check" size={16} /> Aprovar
            </button>
            <button type="button" className="uk-button uk-button-danger uk-button-small" onClick={() => onReview(video, 'rejected')}>Recusar</button>
          </span>
        </div>
      )}
      {video.status === 'pending' && own && <p className="post-note">Esperando a aprovação do líder. Por enquanto, só você e os líderes veem este vídeo.</p>}
      {video.status === 'rejected' && <p className="post-note">Recusado pelo líder{video.reason ? `: ${video.reason}` : '.'} Só você vê este aviso.</p>}
    </article>
  );
};

/* ─── Enquete ───────────────────────────────────────────────── */
interface PollCardProps {
  poll: Poll;
  me: Me;
  creator: Person | null;
  onVote: (pollId: string, optionId: string) => void;
  onDelete: (pollId: string) => void;
}

export const PollCard: React.FC<PollCardProps> = ({ poll, me, creator, onVote, onDelete }) => {
  // Depois de votar (ou com a enquete encerrada) mostram-se os resultados
  const showResults = poll.myVoteOptionId !== null || !!poll.isExpired;
  const canVote = !poll.isExpired;
  const canDelete = isManager(me) || poll.createdBy === me.id;

  const vote = (e: React.MouseEvent<HTMLButtonElement>, optionId: string) => {
    if (optionId === poll.myVoteOptionId) return;
    // O primeiro voto é celebrado; trocar de opção só dá o retorno do toque
    if (!poll.myVoteOptionId) burst(e.currentTarget, { count: 9, colors: ['--accent', '--success'], spread: 18 });
    onVote(poll.id, optionId);
  };

  return (
    <article className="post" aria-labelledby={`poll-${poll.id}`}>
      <ItemHead
        id={`poll-${poll.id}`}
        person={creator}
        linkProfile
        at={poll.createdAt}
        label={{ icon: 'poll', text: poll.isExpired ? 'Enquete encerrada' : 'Enquete' }}
        actions={canDelete ? [{ label: 'Excluir enquete', icon: 'trash', danger: true, onSelect: () => onDelete(poll.id) }] : []}
        menuLabel="Opções da enquete"
      />
      <h3 className="post-title">{poll.question}</h3>
      <div className="poll-options" style={{ padding: '12px 16px 0' }}>
        {poll.options.map(opt => (
          <button key={opt.id} type="button" className={`poll-option press${opt.hasVoted ? ' is-voted' : ''}`} disabled={!canVote}
            aria-pressed={opt.hasVoted} onClick={e => vote(e, opt.id)}>
            {showResults && <span className="poll-fill meter-fill" style={{ transform: `scaleX(${opt.percentage / 100})` }} />}
            <span className="poll-option-row">
              <span>{opt.text}</span>
              {showResults && <span className="poll-percent"><AnimatedNumber value={opt.percentage} />%</span>}
            </span>
          </button>
        ))}
      </div>
      <p className="poll-foot" style={{ padding: '0 16px 14px' }}>
        {plural(poll.totalVotes, 'voto', 'votos')}
        {!poll.isExpired && poll.expiresAt && ` · encerra em ${new Date(poll.expiresAt).toLocaleDateString('pt-BR', { day: 'numeric', month: 'short' })}`}
        {poll.myVoteOptionId && !poll.isExpired && ' · toque em outra opção para mudar o voto'}
      </p>
    </article>
  );
};

/* ─── Encontro ──────────────────────────────────────────────── */
const RSVP_LABELS = { going: 'Vou', maybe: 'Talvez', not_going: 'Não vou' } as const;

interface EventCardProps {
  event: EventItem;
  me: Me;
  creator: Person | null;
  onRsvp: (id: string, status: string) => void;
  onEdit: (event: EventItem) => void;
  onDelete: (id: string) => void;
}

export const EventCard: React.FC<EventCardProps> = ({ event, me, creator, onRsvp, onEdit, onDelete }) => {
  const past = new Date(event.startDate) < new Date();
  const canManage = event.createdBy === me.id || isManager(me);
  return (
    <article className="post" aria-labelledby={`event-${event.id}`}>
      <ItemHead
        id={`event-${event.id}-by`}
        person={creator}
        linkProfile
        at={event.createdAt}
        label={{ icon: 'calendar', text: past ? 'Encontro que já aconteceu' : 'Encontro' }}
        actions={canManage ? [
          { label: 'Editar', icon: 'pencil', onSelect: () => onEdit(event) },
          { label: 'Excluir', icon: 'trash', danger: true, onSelect: () => onDelete(event.id) },
        ] : []}
        menuLabel="Opções do encontro"
      />
      <div className="post-event">
        <DateChip date={event.startDate} />
        <div style={{ minWidth: 0 }}>
          <h3 id={`event-${event.id}`} className="event-title">{event.title}</h3>
          <div className="event-facts">
            <span><Icon name="clock" size={16} /> {dayLabel(event.startDate)}, {timeOnly(event.startDate)}{event.endDate ? ` – ${timeOnly(event.endDate)}` : ''}</span>
            {event.location && <span><Icon name="location" size={16} /> {event.location}</span>}
          </div>
        </div>
      </div>
      <ItemText text={event.description} />
      <div className="post-actions" style={{ justifyContent: 'space-between', gap: '10px', padding: '12px 16px 14px' }}>
        <span className="event-count">
          <strong><AnimatedNumber value={event.goingCount} /></strong> {event.goingCount === 1 ? 'confirmado' : 'confirmados'}
          {event.maybeCount > 0 && <> · <strong><AnimatedNumber value={event.maybeCount} /></strong> talvez</>}
        </span>
        {!past && (
          <div className="segmented" role="group" aria-label={`Presença em ${event.title}`}>
            {(Object.keys(RSVP_LABELS) as (keyof typeof RSVP_LABELS)[]).map(s => {
              const isActive = event.myStatus === s;
              return (
                <button key={s} type="button" className="press" aria-pressed={isActive}
                  onClick={e => {
                    // Confirmar presença merece festa; "talvez"/"não vou" só o toque
                    if (!isActive && s === 'going') { pop(e.currentTarget, 1.12); burst(e.currentTarget, { count: 8, colors: ['--accent', '--success'] }); }
                    onRsvp(event.id, isActive ? 'none' : s);
                  }}>
                  {RSVP_LABELS[s]}
                </button>
              );
            })}
          </div>
        )}
      </div>
    </article>
  );
};
