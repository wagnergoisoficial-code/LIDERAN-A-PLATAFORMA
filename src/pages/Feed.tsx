import React, { useState, useEffect, useCallback, useLayoutEffect, useMemo, useRef } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import UIkit from 'uikit';
import { api } from '../services/api';
import { useAuth } from '../context/AuthContext';
import { useCommunity, FEED_CHANGED_EVENT, FeedKind } from '../lib/community';
import { timeOnly, timeAgo, shortTime, firstName, plural } from '../lib/format';
import { celebrate } from '../lib/motion';
import Avatar from '../components/Avatar';
import Icon from '../components/Icon';
import Modal from '../components/Modal';
import EmptyState from '../components/EmptyState';
import DateChip from '../components/DateChip';
import { useComposer } from '../components/Composer';
import { EventFormModal } from '../components/EventForm';
import {
  Post, Prayer, Devotional, Video, Poll, EventItem, Person, PostReactions, EMPTY_REACTIONS, isPinnedPost,
  PostCard, PrayerCard, DevotionalCard, VideoCard, PollCard, EventCard,
} from '../components/FeedCards';

interface Member extends Person { title?: string | null; role?: string }
interface MemberStat { userId: string; name: string; profileImage?: string; posts: number; comments: number; total: number }

// Tudo o que a comunidade partilha, num só sítio
interface Extras { prayers: Prayer[]; devotionals: Devotional[]; videos: Video[]; waiting: Video[]; polls: Poll[]; events: EventItem[] }
const EMPTY_EXTRAS: Extras = { prayers: [], devotionals: [], videos: [], waiting: [], polls: [], events: [] };

type Item =
  | { kind: 'post'; key: string; at: number; post: Post }
  | { kind: 'prayer'; key: string; at: number; prayer: Prayer }
  | { kind: 'devotional'; key: string; at: number; devotional: Devotional }
  | { kind: 'video'; key: string; at: number; video: Video }
  | { kind: 'poll'; key: string; at: number; poll: Poll }
  | { kind: 'event'; key: string; at: number; event: EventItem };

const time = (value: string) => new Date(value).getTime();

// O feed mistura os tipos, como uma rede social: em cada 7 itens, 3 publicações e um de cada outro tipo.
// Cada tipo segue a sua ordem (o mais atual primeiro). Com os mesmos dados, a ordem é sempre a mesma.
type MixKind = 'post' | 'prayer' | 'video' | 'poll' | 'event';
type FeedOrder = 'recent' | 'relevant' | 'saved';
const MIX_ORDER: MixKind[] = ['post', 'prayer', 'video', 'poll', 'event'];
const MIX_WEIGHT: Record<MixKind, number> = { post: 3, prayer: 1, video: 1, poll: 1, event: 1 };

const mixFeed = (buckets: Record<MixKind, Item[]>, morePosts: boolean) => {
  const result: Item[] = [];
  const taken: Record<MixKind, number> = { post: 0, prayer: 0, video: 0, poll: 0, event: 0 };
  const credit: Record<MixKind, number> = { post: 0, prayer: 0, video: 0, poll: 0, event: 0 };
  for (;;) {
    // Ainda há publicações por carregar: o resto espera por elas, para nada mudar de lugar depois
    if (morePosts && taken.post >= buckets.post.length) break;
    const open = MIX_ORDER.filter(k => taken[k] < buckets[k].length);
    if (!open.length) break;
    const total = open.reduce((sum, k) => sum + MIX_WEIGHT[k], 0);
    let pick = open[0];
    open.forEach(k => {
      credit[k] += MIX_WEIGHT[k];
      if (credit[k] > credit[pick]) pick = k;
    });
    credit[pick] -= total;
    result.push(buckets[pick][taken[pick]++]);
  }
  return result;
};

interface ChatMessage { id: string; content: string; createdAt: string; user: { id: string; name: string; profileImage?: string } }

// Últimas mensagens do chat da comunidade, atualizadas a cada 10 s (com o separador visível)
const useChatPeek = (enabled: boolean) => {
  const [messages, setMessages] = useState<ChatMessage[] | null>(null);
  const [fresh, setFresh] = useState<Set<string>>(new Set());
  const seen = useRef<Set<string> | null>(null);
  useEffect(() => {
    if (!enabled) return;
    let alive = true;
    const load = () => api.getMessages(3).then(res => {
      if (!alive || !res.success) return;
      const list: ChatMessage[] = res.data || [];
      // A primeira carga não anima; depois, cada mensagem nova entra com destaque
      setFresh(new Set(seen.current ? list.filter(m => !seen.current!.has(m.id)).map(m => m.id) : []));
      seen.current = new Set([...(seen.current || []), ...list.map(m => m.id)]);
      setMessages(list);
    }).catch(() => { if (alive) setMessages(prev => prev ?? []); });
    load();
    const timer = setInterval(() => { if (document.visibilityState === 'visible') load(); }, 10000);
    return () => { alive = false; clearInterval(timer); };
  }, [enabled]);
  return { messages, fresh };
};
const notify = (message: string, status: 'success' | 'danger' = 'danger') => UIkit.notification({ message, status, pos: 'top-right' });

// O feed fica guardado ao sair: ao voltar, reaparece igual e na mesma posição de leitura
// Quem ainda não tem data de nascimento indica-a aqui uma vez; o feed avisa a comunidade na véspera
const BirthDateAsk = () => {
  const { refreshUser } = useAuth();
  const [value, setValue] = useState('');
  const [saving, setSaving] = useState(false);

  const save = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    try {
      await api.updateUserProfile({ birthDate: value });
      await refreshUser();
      notify('Data de nascimento guardada', 'success');
    } catch (err: any) {
      notify(err.message || 'Não foi possível guardar');
      setSaving(false);
    }
  };

  return (
    <form className="card birthday-ask" onSubmit={save}>
      <span className="group-avatar"><Icon name="cake" /></span>
      <label htmlFor="ask-birth" style={{ flex: '1 1 220px', minWidth: 0 }}>
        <span className="list-row-title"><span>Quando é o seu aniversário?</span></span>
        <span className="list-row-meta" style={{ display: 'block' }}>A comunidade recebe um aviso na véspera para dar os parabéns.</span>
      </label>
      <span style={{ display: 'flex', gap: '8px' }}>
        <input id="ask-birth" className="form-input" type="date" required max={new Date().toLocaleDateString('en-CA')}
          value={value} onChange={e => setValue(e.target.value)} style={{ width: 'auto' }} />
        <button type="submit" className="uk-button uk-button-primary" disabled={saving || !value}>Guardar</button>
      </span>
    </form>
  );
};

interface FeedCache { key: string; posts: Post[]; nextCursor: string | null; extras: Extras; members: Member[]; scrollY: number }
let feedCache: FeedCache | null = null;

const Feed = () => {
  const { user } = useAuth();
  const { community } = useCommunity();
  const { openComposer } = useComposer();
  const navigate = useNavigate();
  const isLeader = user?.role === 'leader' || user?.role === 'admin';
  const cacheKey = `${user?.id}:${user?.churchId}`;
  const restored = useRef(feedCache?.key === cacheKey ? feedCache : null).current;
  const restoreY = useRef(restored?.scrollY || 0);

  const [posts, setPosts] = useState<Post[]>(restored?.posts || []);
  const [nextCursor, setNextCursor] = useState<string | null>(restored?.nextCursor ?? null);
  const [extras, setExtras] = useState<Extras>(restored?.extras || EMPTY_EXTRAS);
  const [members, setMembers] = useState<Member[]>(restored?.members || []);
  const [active, setActive] = useState<MemberStat[]>([]);
  const [loading, setLoading] = useState(!restored);
  const [loadError, setLoadError] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);
  // O que chegou depois deste instante só aparece quando a pessoa pede (a leitura não salta)
  const [cutoff, setCutoff] = useState(Infinity);
  const [order, setOrder] = useState<FeedOrder>('recent');
  // shortcut: as guardadas ficam só neste aparelho (localStorage); passar para a API se ele as quiser noutros aparelhos
  const savedKey = `lidera:guardadas:${user?.id}`;
  const [saved, setSaved] = useState<string[]>(() => {
    try { return JSON.parse(localStorage.getItem(savedKey) || '[]'); } catch { return []; }
  });
  const [savedPosts, setSavedPosts] = useState<Post[] | null>(null);
  const [viewer, setViewer] = useState<string | null>(null);
  const [editingEvent, setEditingEvent] = useState<EventItem | null>(null);
  const loadingMoreRef = useRef(false);
  const shownUntil = useRef(0);
  const sentinel = useRef<HTMLDivElement>(null);

  useEffect(() => {
    feedCache = { key: cacheKey, posts, nextCursor, extras, members, scrollY: feedCache?.key === cacheKey ? feedCache.scrollY : 0 };
  }, [cacheKey, posts, nextCursor, extras, members]);

  // Guarda a posição enquanto se lê (o listener sai antes de a página seguinte voltar ao topo)
  useLayoutEffect(() => {
    const onScroll = () => { if (feedCache?.key === cacheKey) feedCache.scrollY = window.scrollY; };
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, [cacheKey]);

  // Repõe a posição; as imagens podem ainda estar a ocupar espaço, por isso tenta durante 1 s
  useEffect(() => {
    const target = restoreY.current;
    if (!target) return;
    let tries = 0;
    let stopped = false;
    const stop = () => { stopped = true; };
    window.addEventListener('wheel', stop, { once: true, passive: true });
    window.addEventListener('touchstart', stop, { once: true, passive: true });
    const attempt = () => {
      if (stopped) return;
      window.scrollTo(0, target);
      if (Math.abs(window.scrollY - target) > 2 && tries++ < 20) setTimeout(attempt, 50);
    };
    requestAnimationFrame(attempt);
    return () => {
      stopped = true;
      window.removeEventListener('wheel', stop);
      window.removeEventListener('touchstart', stop);
    };
  }, []);

  const loadExtras = useCallback(async (only?: FeedKind) => {
    const want = (kind: FeedKind) => !only || only === kind;
    const patch = (change: Partial<Extras>) => setExtras(prev => ({ ...prev, ...change }));
    await Promise.allSettled([
      want('prayer') && api.getPrayerRequests().then(res => patch({ prayers: res.data || [] })),
      want('devotional') && api.getDevotionals().then(res => patch({ devotionals: (res.data || []).filter((d: Devotional) => d.isActive) })),
      want('video') && api.getVideos().then(res => patch({ videos: res.data?.videos || [], waiting: res.data?.waiting || [] })),
      want('poll') && api.getPolls().then(res => patch({ polls: res.data || [] })),
      want('event') && api.getEvents().then(res => patch({ events: res.data || [] })),
    ]);
  }, []);

  // Primeira página das publicações: "replace" recomeça; "merge" junta as novas às que já estão
  const loadPosts = useCallback(async (mode: 'replace' | 'merge') => {
    const res = await api.getPosts();
    if (!res.success) return;
    const fresh: Post[] = res.data;
    if (mode === 'replace') {
      setPosts(fresh);
      setNextCursor(res.nextCursor || null);
    } else {
      const byId = new Map(fresh.map(p => [p.id, p]));
      setPosts(prev => [...fresh.filter(p => !prev.some(old => old.id === p.id)), ...prev.map(p => byId.get(p.id) || p)]);
    }
  }, []);

  // Atualização em segundo plano: o que for novo fica guardado atrás do aviso
  const refresh = useCallback(async () => {
    setCutoff(c => (c === Infinity ? shownUntil.current : c));
    await Promise.allSettled([loadPosts('merge'), loadExtras()]);
  }, [loadPosts, loadExtras]);

  useEffect(() => {
    if (!user?.churchId) { setLoading(false); return; }
    if (restored) {
      refresh();
    } else {
      Promise.allSettled([loadPosts('replace'), loadExtras()]).then(([postsResult]) => {
        setLoadError(postsResult.status === 'rejected');
        setLoading(false);
      });
    }
    api.getUsers().then(res => setMembers(res.data || [])).catch(() => {});
    api.getChurchMemberStats(user.churchId).then(res => {
      setActive((res.data || []).filter((m: MemberStat) => m.userId !== user.id && m.total > 0).slice(0, 3));
    }).catch(() => {});
    const timer = setInterval(() => { if (document.visibilityState === 'visible') refresh(); }, 60000);
    return () => clearInterval(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user?.churchId]);

  // O que a própria pessoa publica (no diálogo ou na agenda) entra logo
  useEffect(() => {
    const onChanged = (e: Event) => {
      const { kind, item } = (e as CustomEvent<{ kind: FeedKind; item?: any }>).detail;
      setCutoff(Infinity);
      if (kind === 'post' && item?.id) setPosts(prev => [item, ...prev.filter(p => p.id !== item.id)]);
      else if (kind === 'prayer' && item?.id) setExtras(prev => ({ ...prev, prayers: [item, ...prev.prayers.filter(p => p.id !== item.id)] }));
      else if (kind === 'event' && item?.id) setExtras(prev => ({ ...prev, events: [...prev.events.filter(ev => ev.id !== item.id), item] }));
      else if (kind === 'poll' && item?.id) setExtras(prev => ({ ...prev, polls: [item, ...prev.polls.filter(p => p.id !== item.id)] }));
      else loadExtras(kind);
    };
    window.addEventListener(FEED_CHANGED_EVENT, onChanged);
    return () => window.removeEventListener(FEED_CHANGED_EVENT, onChanged);
  }, [loadExtras]);

  const loadMore = useCallback(async () => {
    if (!nextCursor || loadingMoreRef.current) return;
    loadingMoreRef.current = true;
    setLoadingMore(true);
    try {
      const res = await api.getPosts(nextCursor);
      if (res.success) {
        setPosts(prev => [...prev, ...res.data.filter((p: Post) => !prev.some(existing => existing.id === p.id))]);
        setNextCursor(res.nextCursor || null);
      }
    } catch (err: any) {
      notify(err.message || 'Não foi possível carregar mais publicações');
    } finally {
      loadingMoreRef.current = false;
      setLoadingMore(false);
    }
  }, [nextCursor]);

  // Rolar até ao fim carrega a página seguinte
  useEffect(() => {
    const el = sentinel.current;
    if (!el || !nextCursor) return;
    const observer = new IntersectionObserver(entries => { if (entries[0].isIntersecting) loadMore(); }, { rootMargin: '600px 0px' });
    observer.observe(el);
    return () => observer.disconnect();
  }, [nextCursor, loadMore]);

  const membersById = useMemo(() => new Map(members.map(m => [m.id, m])), [members]);
  const chat = useChatPeek(!!user?.churchId);

  // Fixados e devocionais do dia no topo; o resto misturado (ver mixFeed). O que chegou depois do
  // último instante mostrado fica de fora até a pessoa tocar em "novidades".
  const { featured, stream, pending } = useMemo(() => {
    const now = Date.now();
    if (order === 'saved') {
      const ids = new Set(saved);
      const list = [...posts, ...(savedPosts || []).filter(p => !posts.some(x => x.id === p.id))]
        .filter(p => ids.has(p.id))
        .map(post => ({ kind: 'post' as const, key: `post:${post.id}`, at: time(post.createdAt), post }))
        .sort((a, b) => b.at - a.at);
      return { featured: [] as Item[], stream: list as Item[], pending: 0 };
    }
    const shown = <T extends Item>(items: T[]) => items.filter(item => item.at <= cutoff);
    const byRecent = <T extends { createdAt: string }>(a: T, b: T) => time(b.createdAt) - time(a.createdAt);
    const videoIds = new Set<string>();
    const videos = [...extras.waiting, ...extras.videos].filter(v => (videoIds.has(v.id) ? false : (videoIds.add(v.id), true)));
    const upcoming = extras.events.filter(e => time(e.startDate) >= now).sort((a, b) => time(a.startDate) - time(b.startDate));
    const past = extras.events.filter(e => time(e.startDate) < now).sort((a, b) => time(b.startDate) - time(a.startDate));
    // Em cada tipo, primeiro o que ainda pede ação: orações por responder, enquetes abertas, encontros por vir
    const buckets: Record<MixKind, Item[]> = {
      post: posts.map(post => ({ kind: 'post' as const, key: `post:${post.id}`, at: time(post.createdAt), post })),
      prayer: [...extras.prayers.filter(p => !p.isAnswered).sort(byRecent), ...extras.prayers.filter(p => p.isAnswered).sort(byRecent)]
        .map(prayer => ({ kind: 'prayer' as const, key: `prayer:${prayer.id}`, at: time(prayer.createdAt), prayer })),
      video: videos.map(video => ({ kind: 'video' as const, key: `video:${video.id}`, at: time(video.createdAt), video })),
      poll: [...extras.polls.filter(p => !p.isExpired).sort(byRecent), ...extras.polls.filter(p => p.isExpired).sort(byRecent)]
        .map(poll => ({ kind: 'poll' as const, key: `poll:${poll.id}`, at: time(poll.createdAt), poll })),
      event: [...upcoming, ...past].map(event => ({ kind: 'event' as const, key: `event:${event.id}`, at: time(event.createdAt), event })),
    };
    // O que a liderança publicou nos últimos 7 dias fica no topo, com as fixadas e os aniversários
    const leaders = new Set(members.filter(m => m.role === 'leader' || m.role === 'admin').map(m => m.id));
    const fromLeader = (authorId: string | null | undefined, at: number) => !!authorId && leaders.has(authorId) && now - at < 7 * 24 * 60 * 60 * 1000;
    const isTop = (item: Item) => {
      switch (item.kind) {
        case 'post': return !!item.post.top || isPinnedPost(item.post);
        case 'prayer': return fromLeader(item.prayer.userId, item.at);
        case 'video': return fromLeader(item.video.author?.id, item.at);
        case 'poll': return fromLeader(item.poll.createdBy, item.at);
        case 'event': return fromLeader(item.event.createdBy, item.at);
        default: return false;
      }
    };
    const lifted: Item[] = [];
    MIX_ORDER.forEach(k => {
      lifted.push(...buckets[k].filter(isTop));
      buckets[k] = buckets[k].filter(item => !isTop(item));
    });
    const hidden = MIX_ORDER.reduce((sum, k) => sum + buckets[k].length - shown(buckets[k]).length, 0);
    MIX_ORDER.forEach(k => { buckets[k] = shown(buckets[k]); });
    const pinnedFirst = (item: Item) => (item.kind === 'post' && isPinnedPost(item.post) ? 1 : 0);
    const top: Item[] = [
      ...lifted,
      ...extras.devotionals.map(devotional => ({ kind: 'devotional' as const, key: `devotional:${devotional.id}`, at: time(devotional.createdAt), devotional })),
    ].sort((a, b) => pinnedFirst(b) - pinnedFirst(a) || b.at - a.at);
    if (order === 'recent') {
      // Por data; com mais páginas por carregar, só o que é mais novo do que a última publicação carregada
      const regular = posts.filter(p => !p.top);
      const boundary = nextCursor && regular.length ? Math.min(...regular.map(p => time(p.createdAt))) : -Infinity;
      const all = MIX_ORDER.flatMap(k => buckets[k]).filter(item => item.at >= boundary).sort((a, b) => b.at - a.at);
      return { featured: top, stream: all, pending: hidden };
    }
    return { featured: top, stream: mixFeed(buckets, !!nextCursor), pending: hidden };
  }, [posts, nextCursor, extras, cutoff, members, order, saved, savedPosts]);

  // Guardadas que não estão nas páginas carregadas vêm uma a uma (no máximo 50)
  useEffect(() => {
    if (order !== 'saved') return;
    const loaded = new Set(posts.map(p => p.id));
    const missing = saved.filter(id => !loaded.has(id)).slice(0, 50);
    let alive = true;
    Promise.allSettled(missing.map(id => api.getPost(id))).then(results => {
      if (alive) setSavedPosts(results.flatMap(r => (r.status === 'fulfilled' && r.value?.data ? [r.value.data as Post] : [])));
    });
    return () => { alive = false; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [order]);

  const toggleSave = (postId: string) => {
    const next = saved.includes(postId) ? saved.filter(id => id !== postId) : [postId, ...saved].slice(0, 200);
    setSaved(next);
    localStorage.setItem(savedKey, JSON.stringify(next));
    notify(next.includes(postId) ? 'Publicação guardada' : 'Publicação removida das guardadas', 'success');
  };

  shownUntil.current = Math.max(0, ...stream.map(item => item.at));

  const showPending = () => {
    setCutoff(Infinity);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  /* ─── Ações ─── */
  const patchPost = (postId: string, change: (p: Post) => Post) => {
    setPosts(prev => prev.map(p => (p.id === postId ? change(p) : p)));
    setSavedPosts(prev => prev && prev.map(p => (p.id === postId ? change(p) : p)));
  };
  // Substitui (ou, com null, retira) um item de uma das listas do feed
  const patchList = <K extends keyof Extras>(list: K, id: string, change: (item: Extras[K][number]) => Extras[K][number] | null) =>
    setExtras(prev => ({
      ...prev,
      [list]: (prev[list] as Extras[K][number][]).map(item => (item.id === id ? change(item) : item)).filter(Boolean),
    }));

  const handleReact = async (postId: string, type: keyof PostReactions, hasReacted: boolean) => {
    // Muda já no ecrã; se o servidor recusar, volta atrás
    const apply = (p: Post, add: boolean) => {
      const reactions = { ...(p.reactions ?? EMPTY_REACTIONS) };
      reactions[type] = Math.max(0, reactions[type] + (add ? 1 : -1));
      const mine = p.myReactions ?? [];
      return { ...p, reactions, myReactions: add ? [...mine, type] : mine.filter(r => r !== type) };
    };
    patchPost(postId, p => apply(p, !hasReacted));
    try {
      if (hasReacted) await api.removeReaction(postId, type);
      else await api.reactToPost(postId, type);
    } catch (err: any) {
      patchPost(postId, p => apply(p, hasReacted));
      notify(err.message || 'Não foi possível reagir');
    }
  };

  const handlePin = async (postId: string, isPinned: boolean) => {
    try {
      await api.pinPost(postId, !isPinned);
      patchPost(postId, p => ({ ...p, isPinned: !isPinned }));
      notify(isPinned ? 'Publicação desafixada' : 'Publicação fixada no topo', 'success');
    } catch (err: any) {
      notify(err.message || 'Não foi possível concluir');
    }
  };

  const handleAddComment = async (postId: string, content: string) => {
    try {
      const result = await api.addComment(postId, { content });
      if (result.success) patchPost(postId, p => ({ ...p, comments: [...p.comments, result.data] }));
      return true;
    } catch (err: any) {
      notify(err.message || 'Não foi possível comentar');
      return false;
    }
  };

  const handleDeletePost = async (postId: string) => {
    if (!confirm('Excluir esta publicação?')) return;
    try {
      await api.deletePost(postId);
      setPosts(prev => prev.filter(p => p.id !== postId));
      setSavedPosts(prev => prev && prev.filter(p => p.id !== postId));
      notify('Publicação excluída', 'success');
    } catch (err: any) {
      notify(err.message || 'Não foi possível excluir');
    }
  };

  const handleDonated = async (postId: string, donated: boolean) => {
    try {
      const res = await api.setDonated(postId, donated);
      patchPost(postId, p => ({ ...p, donatedAt: res.data.donatedAt }));
      notify(res.message, 'success');
    } catch (err: any) {
      notify(err.message || 'Não foi possível concluir');
    }
  };

  const handleDeleteComment = async (postId: string, commentId: string) => {
    if (!confirm('Excluir este comentário?')) return;
    try {
      await api.deleteComment(postId, commentId);
      patchPost(postId, p => ({ ...p, comments: p.comments.filter(c => c.id !== commentId) }));
    } catch (err: any) {
      notify(err.message || 'Não foi possível excluir o comentário');
    }
  };

  const handlePray = async (id: string, hasPrayed: boolean) => {
    try {
      const res = hasPrayed ? await api.unprayForRequest(id) : await api.prayForRequest(id);
      if (res.data) patchList('prayers', id, () => res.data);
    } catch (err: any) {
      notify(err.message || 'Não foi possível concluir');
    }
  };

  const handleAnswered = async (id: string, origin?: DOMRect) => {
    try {
      const res = await api.markPrayerAnswered(id);
      celebrate(origin, ['--success', '--accent', '--success-dark']);
      if (res.data) patchList('prayers', id, () => res.data);
      notify('Oração respondida. Glória a Deus!', 'success');
    } catch (err: any) {
      notify(err.message || 'Não foi possível concluir');
    }
  };

  const handleDeletePrayer = async (id: string) => {
    if (!confirm('Excluir este pedido de oração?')) return;
    try {
      await api.deletePrayerRequest(id);
      patchList('prayers', id, () => null);
    } catch (err: any) {
      notify(err.message || 'Não foi possível excluir');
    }
  };

  const handleLikeDevotional = async (id: string) => {
    try {
      const res = await api.likeDevotional(id);
      if (res.success) patchList('devotionals', id, d => ({ ...d, hasLiked: res.data.liked, likeCount: res.data.likeCount }));
    } catch (err: any) {
      notify(err.message || 'Não foi possível registrar o Amém');
    }
  };

  const handleRetireDevotional = async (id: string) => {
    if (!confirm('Retirar este devocional do feed? Você pode publicar de novo no Painel do líder.')) return;
    try {
      await api.markDevotionalInactive(id);
      patchList('devotionals', id, () => null);
      notify('Devocional retirado do feed', 'success');
    } catch (err: any) {
      notify(err.message || 'Não foi possível retirar');
    }
  };

  const handleReviewVideo = async (video: Video, status: 'approved' | 'rejected') => {
    let reason: string | undefined;
    if (status === 'rejected') {
      const answer = prompt(`Recusar "${video.title}"? Escreva o motivo para o autor (opcional):`);
      if (answer === null) return;
      reason = answer;
    }
    try {
      await api.reviewVideo(video.id, status, reason);
      notify(status === 'approved' ? 'Vídeo aprovado: já aparece para todas as comunidades' : 'Vídeo recusado', 'success');
      loadExtras('video');
    } catch (err: any) {
      notify(err.message || 'Não foi possível concluir');
    }
  };

  const handleDeleteVideo = async (video: Video) => {
    if (!confirm(`Apagar o vídeo "${video.title}"?`)) return;
    try {
      await api.deleteVideo(video.id);
      setExtras(prev => ({ ...prev, videos: prev.videos.filter(v => v.id !== video.id), waiting: prev.waiting.filter(v => v.id !== video.id) }));
      notify('Vídeo apagado', 'success');
    } catch (err: any) {
      notify(err.message || 'Não foi possível apagar');
    }
  };

  const handleVotePoll = async (pollId: string, optionId: string) => {
    try {
      const res = await api.votePoll(pollId, optionId);
      if (res.success && res.data) patchList('polls', pollId, () => res.data);
    } catch (err: any) {
      notify(err.message || 'Não foi possível votar');
    }
  };

  const handleDeletePoll = async (pollId: string) => {
    if (!confirm('Excluir esta enquete?')) return;
    try {
      await api.deletePoll(pollId);
      patchList('polls', pollId, () => null);
    } catch (err: any) {
      notify(err.message || 'Não foi possível excluir a enquete');
    }
  };

  const handleRsvp = async (eventId: string, status: string) => {
    try {
      const res = await api.rsvpEvent(eventId, status);
      if (res.success && res.data) patchList('events', eventId, () => res.data);
    } catch (err: any) {
      notify(err.message || 'Não foi possível responder');
    }
  };

  const handleDeleteEvent = async (eventId: string) => {
    if (!confirm('Excluir este encontro?')) return;
    try {
      await api.deleteEvent(eventId);
      patchList('events', eventId, () => null);
      notify('Encontro excluído', 'success');
    } catch (err: any) {
      notify(err.message || 'Não foi possível excluir');
    }
  };

  const startConversation = async (userId: string) => {
    try {
      const res = await api.startConversation(userId);
      navigate(`/messages?c=${res.data.id}`);
    } catch (err: any) {
      notify(err.message || 'Não foi possível abrir a conversa');
    }
  };

  if (!user?.churchId) {
    return (
      <div className="page is-narrow">
        <h1 className="visually-hidden">Feed</h1>
        <div className="card">
          <EmptyState
            icon="users"
            title="Você ainda não participa de uma comunidade"
            text={isLeader ? 'Crie sua comunidade no Painel do líder para começar.' : 'Peça ao líder da sua comunidade o link de convite.'}
            action={isLeader && <Link className="uk-button uk-button-primary" to="/painel/lideranca">Abrir o Painel do líder</Link>}
          />
        </div>
      </div>
    );
  }

  const me = { id: user.id, name: user.name, role: user.role, churchId: user.churchId, profileImage: user.profileImage };
  const lastChat = chat.messages?.[chat.messages.length - 1];
  const person = (id: string): Person | null => membersById.get(id) || null;
  const people = members.filter(m => m.id !== user.id);
  const upcoming = extras.events
    .filter(e => time(e.startDate) >= Date.now())
    .sort((a, b) => time(a.startDate) - time(b.startDate))
    .slice(0, 2);

  const renderItem = (item: Item) => {
    switch (item.kind) {
      case 'post':
        return <PostCard key={item.key} post={item.post} me={me} onDonated={handleDonated} onOpenImage={setViewer} onComment={handleAddComment}
          onReact={handleReact} onPin={handlePin} onDelete={handleDeletePost} onDeleteComment={handleDeleteComment}
          saved={saved.includes(item.post.id)} onSave={toggleSave} />;
      case 'prayer':
        return <PrayerCard key={item.key} prayer={item.prayer} me={me} onPray={handlePray} onAnswered={handleAnswered} onDelete={handleDeletePrayer} />;
      case 'devotional':
        return <DevotionalCard key={item.key} devotional={item.devotional} me={me} onLike={handleLikeDevotional} onRetire={handleRetireDevotional} />;
      case 'video':
        return <VideoCard key={item.key} video={item.video} me={me} onReview={handleReviewVideo} onDelete={handleDeleteVideo} />;
      case 'poll':
        return <PollCard key={item.key} poll={item.poll} me={me} creator={person(item.poll.createdBy)} onVote={handleVotePoll} onDelete={handleDeletePoll} />;
      case 'event':
        return <EventCard key={item.key} event={item.event} me={me} creator={person(item.event.createdBy)} onRsvp={handleRsvp} onEdit={setEditingEvent} onDelete={handleDeleteEvent} />;
    }
  };

  const empty = !featured.length && !stream.length;

  return (
    <div className="feed-layout">
      <h1 className="visually-hidden">Feed</h1>

      <div className="feed-main">
        {people.length > 0 && (
          <section className="card people-card" aria-labelledby="people-title">
            <div className="card-head">
              <h2 id="people-title">Pessoas da comunidade</h2>
              <Link className="section-link" to="/users">Ver todas</Link>
            </div>
            <div className="people-strip">
              {people.slice(0, 7).map(m => (
                <Link key={m.id} to={`/profile/${m.id}`} className="person" title={m.name} aria-label={m.name}>
                  <Avatar name={m.name} profileImage={m.profileImage} size={82} />
                  <span className="person-name" aria-hidden="true">{firstName(m.name)}</span>
                </Link>
              ))}
            </div>
          </section>
        )}

        <section className="card composer-entry" aria-label="Publicar">
          <div className="composer-entry-row">
            <Avatar name={user.name} profileImage={user.profileImage} size={54} />
            <button type="button" className="composer-trigger" onClick={() => openComposer()}>
              O que você quer compartilhar, {firstName(user.name)}?
            </button>
            <button type="button" className="uk-button uk-button-primary composer-publish" onClick={() => openComposer()}>Publicar</button>
          </div>
          <div className="composer-chips">
            <button type="button" className="ghost-btn" onClick={() => openComposer('photo')}><Icon name="image" size={22} /> Foto</button>
            <button type="button" className="ghost-btn" onClick={() => openComposer('video')}><Icon name="videos" size={22} /> Vídeo</button>
            <button type="button" className="ghost-btn" onClick={() => openComposer('prayer')}><Icon name="praying" size={22} /> Oração</button>
            <button type="button" className="ghost-btn" onClick={() => openComposer('donation')}><Icon name="gift" size={22} /> Doação</button>
          </div>
        </section>

        {!user.birthDate && user.role !== 'admin' && <BirthDateAsk />}

        <Link to="/chat" className="chat-peek-row below-rail" aria-label={`Chat da comunidade${lastChat ? `. Última mensagem de ${lastChat.user.name}: ${lastChat.content}` : ''}`}>
          <span className="group-avatar"><Icon name="chat" /></span>
          <span style={{ flex: 1, minWidth: 0 }}>
            <span className="list-row-title"><span>Chat da comunidade</span></span>
            <span key={lastChat?.id} className={`chat-peek-text${lastChat && chat.fresh.has(lastChat.id) ? ' fade-in' : ''}`}>
              {lastChat ? `${lastChat.user.id === user.id ? 'Você' : firstName(lastChat.user.name)}: ${lastChat.content}` : 'Ainda sem mensagens. Comece a conversa!'}
            </span>
          </span>
          {lastChat && <time className="faint" style={{ fontSize: '12px', flexShrink: 0 }} dateTime={lastChat.createdAt}>{shortTime(lastChat.createdAt)}</time>}
          <Icon name="chevron-right" size={18} className="faint" />
        </Link>

        <section aria-labelledby="posts-title">
          <div className="feed-heading">
            <h2 id="posts-title">Publicações</h2>
            <label className="feed-sort">
              <span className="visually-hidden">Ordenar as publicações</span>
              <select value={order} onChange={e => setOrder(e.target.value as FeedOrder)}>
                <option value="recent">Mais recentes</option>
                <option value="relevant">Mais relevantes</option>
                <option value="saved">Guardadas</option>
              </select>
              <Icon name="chevron-down" size={18} />
            </label>
          </div>

          {loading ? (
            <div aria-busy="true" aria-label="Carregando o feed"><PostSkeleton /><PostSkeleton /></div>
          ) : loadError && empty ? (
            <div className="card">
              <EmptyState icon="warning" title="Não foi possível carregar o feed" text="Verifique a conexão com a internet e tente de novo."
                action={<button type="button" className="uk-button uk-button-default" onClick={() => {
                  setLoading(true);
                  Promise.allSettled([loadPosts('replace'), loadExtras()]).then(([r]) => { setLoadError(r.status === 'rejected'); setLoading(false); });
                }}>Tentar de novo</button>} />
            </div>
          ) : empty && order === 'saved' ? (
            <div className="card">
              <EmptyState icon="bookmark" title="Nenhuma publicação guardada" text="Toque no marcador de uma publicação para a encontrar aqui." />
            </div>
          ) : empty ? (
            <div className="card">
              <EmptyState icon="pencil" title="Ainda não há nada no feed" text="Comece a conversa: compartilhe uma foto, um vídeo, um versículo ou um pedido de oração."
                action={<button type="button" className="uk-button uk-button-primary" onClick={() => openComposer()}><Icon name="plus" size={18} /> Publicar</button>} />
            </div>
          ) : (
            <>
              {featured.map(renderItem)}
              {stream.map(renderItem)}
              <div ref={sentinel} />
              {order === 'saved' ? null : nextCursor ? (
                <div className="feed-end">
                  <button type="button" className="uk-button uk-button-default" onClick={loadMore} disabled={loadingMore}>
                    {loadingMore ? <><span uk-spinner="ratio: 0.5"></span> Carregando…</> : 'Carregar mais'}
                  </button>
                </div>
              ) : (
                <p className="feed-end">Você chegou ao fim do feed.</p>
              )}
            </>
          )}
        </section>
      </div>

      <aside className="feed-rail" aria-label="Na sua comunidade">
        {community && (
          <div className="rail-section">
            <h2 className="rail-community-name">{community.name}</h2>
            <div className="rail-community-meta">
              {plural(community.memberCount || members.length, 'membro', 'membros')} · <Link to="/comunidade">Ver comunidade</Link>
            </div>
            {members.length > 0 && (
              <div className="rail-avatars" aria-hidden="true">
                {members.slice(0, 8).map(m => <Avatar key={m.id} name={m.name} profileImage={m.profileImage} size={46} />)}
                {(community.memberCount || members.length) > 8 && <span className="rail-avatars-more">+{(community.memberCount || members.length) - 8}</span>}
              </div>
            )}
          </div>
        )}

        <section className="rail-section" aria-labelledby="chat-peek-title">
          <div className="rail-head">
            <h2 id="chat-peek-title">Chat da comunidade</h2>
          </div>
          {chat.messages === null ? (
            <p className="rail-item-meta">Carregando…</p>
          ) : chat.messages.length === 0 ? (
            <p className="rail-item-meta" style={{ whiteSpace: 'normal', marginBottom: '12px' }}>Ainda sem mensagens. Comece a conversa!</p>
          ) : (
            <div className="chat-peek-list" aria-live="polite">
              {chat.messages.map(m => (
                <div key={m.id} className={`chat-peek-msg${chat.fresh.has(m.id) ? ' is-new msg-in' : ''}`}>
                  <Avatar name={m.user.name} profileImage={m.user.profileImage} size={42} />
                  <div className="chat-peek-body">
                    <div className="chat-peek-who">
                      <strong>{m.user.id === user.id ? 'Você' : m.user.name}</strong>
                      <span aria-hidden="true">·</span>
                      <time dateTime={m.createdAt}>{timeAgo(m.createdAt)}</time>
                    </div>
                    <div className="chat-peek-text">{m.content}</div>
                  </div>
                </div>
              ))}
            </div>
          )}
          <Link to="/chat" className="uk-button uk-button-primary rail-chat-btn">
            <Icon name="chat" size={20} /> Abrir o chat <Icon name="arrow-right" size={20} />
          </Link>
        </section>

        <div className="rail-section">
          <div className="rail-head">
            <h2>Próximos encontros</h2>
            <Link className="section-link" to="/events">Agenda</Link>
          </div>
          {upcoming.length === 0 ? (
            <p className="rail-item-meta" style={{ whiteSpace: 'normal' }}>Nenhum encontro marcado.</p>
          ) : upcoming.map(e => (
            <Link key={e.id} to="/events" className="rail-item rail-event">
              <DateChip date={e.startDate} />
              <span className="rail-item-body">
                <span className="rail-item-title" style={{ display: 'block' }}>{e.title}</span>
                <span className="rail-item-meta" style={{ display: 'block' }}>{timeOnly(e.startDate)}{e.location ? ` · ${e.location}` : ''}</span>
              </span>
            </Link>
          ))}
        </div>

        {active.length > 0 && (
          <div className="rail-section">
            <div className="rail-head">
              <h2>Pessoas da comunidade</h2>
            </div>
            {active.map(m => (
              <div key={m.userId} className="rail-item rail-person">
                <Link to={`/profile/${m.userId}`} aria-hidden="true" tabIndex={-1}><Avatar name={m.name} profileImage={m.profileImage} size={52} /></Link>
                <span className="rail-item-body">
                  <Link to={`/profile/${m.userId}`} className="rail-item-title" style={{ display: 'block', color: 'var(--text)' }}>{m.name}</Link>
                  <span className="rail-item-meta" style={{ display: 'block' }}>{plural(m.posts, 'publicação', 'publicações')} · {plural(m.comments, 'comentário', 'comentários')}</span>
                </span>
                <button type="button" className="action-btn" aria-label={`Enviar mensagem para ${m.name}`} title="Enviar mensagem" onClick={() => startConversation(m.userId)}>
                  <Icon name="messages" size={24} />
                </button>
              </div>
            ))}
          </div>
        )}
      </aside>

      {pending > 0 && (
        <button type="button" className="new-posts-pill" onClick={showPending}>
          <Icon name="arrow-up" size={16} strokeWidth={2} />
          {pending === 1 ? '1 novidade' : `${pending} novidades`}
        </button>
      )}

      {viewer && (
        <Modal title="Imagem da publicação" hideTitle variant="media" onClose={() => setViewer(null)}>
          <img src={viewer} alt="" className="media-full" />
        </Modal>
      )}

      {editingEvent && (
        <EventFormModal event={editingEvent} onClose={() => setEditingEvent(null)}
          onSaved={saved => { patchList('events', saved.id, () => saved); setEditingEvent(null); }} />
      )}
    </div>
  );
};

const PostSkeleton = () => (
  <div className="post" style={{ padding: '16px', marginBottom: '12px' }} aria-hidden="true">
    <div style={{ display: 'flex', gap: '12px', alignItems: 'center' }}>
      <div className="skeleton" style={{ width: 40, height: 40, borderRadius: '50%' }} />
      <div style={{ flex: 1 }}>
        <div className="skeleton" style={{ width: '40%', height: 14 }} />
        <div className="skeleton" style={{ width: '24%', height: 12, marginTop: 8 }} />
      </div>
    </div>
    <div className="skeleton" style={{ height: 14, marginTop: 16 }} />
    <div className="skeleton" style={{ width: '82%', height: 14, marginTop: 8 }} />
    <div className="skeleton" style={{ height: 220, marginTop: 14, borderRadius: 'var(--radius)' }} />
  </div>
);

export default Feed;
