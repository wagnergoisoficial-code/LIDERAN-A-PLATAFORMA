import React, { useState, useEffect, useLayoutEffect, useRef, Component } from 'react';
import { Routes, Route, Navigate, Link, useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from './context/AuthContext';
import { useTheme } from './context/ThemeContext';
import { api, UNREAD_MESSAGES_EVENT } from './services/api';
import { roleLabel, timeAgo, fullDate } from './lib/format';
import Avatar from './components/Avatar';
import Icon, { IconName } from './components/Icon';
import { useDismiss, moveFocus } from './components/MoreMenu';
import { ComposerProvider, useComposer } from './components/Composer';
import { COMMUNITY_TABS } from './components/SectionTabs';

import Login from './pages/Login';
import Register from './pages/Register';
import InviteRegister from './pages/InviteRegister';
import Feed from './pages/Feed';
import Posts from './pages/Posts';
import Community from './pages/Community';
import Users from './pages/Users';
import Dashboard from './pages/Dashboard';
import Profile from './pages/Profile';
import Chat from './pages/Chat';
import Events from './pages/Events';
import Reports from './pages/Reports';
import Messages from './pages/Messages';
import Bible from './pages/Bible';
import GuardianHome from './pages/GuardianHome';

class ErrorBoundary extends Component<{ children: React.ReactNode }, { error: Error | null }> {
  constructor(props: any) {
    super(props);
    this.state = { error: null };
  }
  static getDerivedStateFromError(error: Error) {
    return { error };
  }
  render() {
    if (this.state.error) {
      return (
        <div className="app-main">
          <div className="page is-narrow">
            <div className="card" style={{ padding: '24px' }}>
              <h1 className="page-title">Algo correu mal nesta página</h1>
              <p className="page-subtitle">Copie a mensagem abaixo e envie ao suporte. Depois, recarregue a página.</p>
              <pre style={{ margin: '16px 0 0', padding: '12px', borderRadius: 'var(--radius)', background: 'var(--bg-surface)', color: 'var(--text-muted)', fontSize: '12px', whiteSpace: 'pre-wrap', wordBreak: 'break-word' }}>
                {this.state.error.message}
              </pre>
              <button className="uk-button uk-button-primary" style={{ marginTop: '16px' }}
                onClick={() => { this.setState({ error: null }); window.location.reload(); }}>
                Recarregar
              </button>
            </div>
          </div>
        </div>
      );
    }
    return this.props.children;
  }
}

const FullPageSpinner = () => (
  <div className="loading-block" style={{ minHeight: '100vh' }} role="status" aria-label="Carregando">
    <span uk-spinner="ratio: 1.4"></span>
  </div>
);

const PrivateRoute: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { isAuthenticated, isLoading } = useAuth();
  if (isLoading) return <FullPageSpinner />;
  if (!isAuthenticated) return <Navigate to="/login" />;
  return <>{children}</>;
};

const RoleRoute: React.FC<{ children: React.ReactNode; allowedRoles: string[] }> = ({ children, allowedRoles }) => {
  const { isAuthenticated, isLoading, user } = useAuth();
  if (isLoading) return <FullPageSpinner />;
  if (!isAuthenticated) return <Navigate to="/login" />;
  if (!user || !allowedRoles.includes(user.role)) return <Navigate to="/" />;
  return <>{children}</>;
};

interface Notification { id: string; type: string; title: string; body: string; isRead: boolean; createdAt: string; linkType?: string | null; linkId?: string | null; }

// Página aberta ao clicar numa notificação: o que se publica está no feed; a gestão, no Painel
const NOTIFICATION_ROUTES: Record<string, string> = {
  post: '/',
  poll: '/',
  event: '/',
  prayer_request: '/',
  devotional: '/',
  video: '/',
  sermon: '/',
  group: '/',
  report: '/dashboard',
  member: '/dashboard',
  verification: '/dashboard',
};

// Destinos principais: o feed, a comunidade (sobre, agenda e membros) e as mensagens
const COMMUNITY_PATHS = COMMUNITY_TABS.map(t => t.to);
const isCommunityPath = (path: string) => COMMUNITY_PATHS.includes(path);
const isLeaderPath = (path: string) => path === '/dashboard' || path === '/reports';

interface NavItem { to: string; label: string; icon: IconName; active: (path: string) => boolean; badge?: number }

/* ─── Mensagens privadas por ler ────────────────────────────── */
const useUnreadMessages = (enabled: boolean) => {
  const location = useLocation();
  const [unread, setUnread] = useState(0);
  // Ao mudar de página, ao ler uma conversa e a cada 30 s (com o separador visível)
  useEffect(() => {
    if (!enabled) return;
    const load = () => api.getUnreadMessages().then(res => setUnread(res.data?.total || 0)).catch(() => {});
    load();
    const timer = setInterval(() => { if (document.visibilityState === 'visible') load(); }, 30000);
    window.addEventListener(UNREAD_MESSAGES_EVENT, load);
    return () => {
      clearInterval(timer);
      window.removeEventListener(UNREAD_MESSAGES_EVENT, load);
    };
  }, [enabled, location.pathname]);
  return unread;
};

const badgeText = (n: number) => (n > 9 ? '9+' : String(n));

/* ─── Pesquisa ──────────────────────────────────────────────── */
interface SearchResults { posts: any[]; members: any[]; events: any[] }

// Em ecrãs estreitos a pesquisa abre por cima do cabeçalho, a partir do ícone (toggle)
const SearchBox: React.FC<{ open: boolean; setOpen: (open: boolean) => void; toggle: React.RefObject<HTMLButtonElement | null> }> = ({ open, setOpen, toggle }) => {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<SearchResults | null>(null);
  const [loading, setLoading] = useState(false);
  const [showResults, setShowResults] = useState(false);
  const box = useRef<HTMLDivElement>(null);
  const input = useRef<HTMLInputElement>(null);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const location = useLocation();

  const close = () => {
    setShowResults(false);
    if (open) {
      setOpen(false);
      toggle.current?.focus();
    }
  };

  useDismiss(showResults || open, close, [box, toggle]);
  useEffect(() => { setShowResults(false); setOpen(false); setQuery(''); setResults(null); }, [location.pathname]);
  useEffect(() => { if (open) input.current?.focus(); }, [open]);

  const search = (q: string) => {
    setQuery(q);
    if (timer.current) clearTimeout(timer.current);
    if (q.trim().length < 2) { setResults(null); setShowResults(false); return; }
    timer.current = setTimeout(async () => {
      setLoading(true);
      try {
        const res = await api.search(q.trim());
        if (res.success) { setResults(res.data); setShowResults(true); }
      } catch { /* sem resultados */ }
      finally { setLoading(false); }
    }, 300);
  };

  const total = results ? results.posts.length + results.members.length + results.events.length : 0;

  return (
    <div ref={box} className={`header-search${open ? ' is-open' : ''}`} role="search">
        <div className="header-search-field">
          <span className="header-search-icon"><Icon name="search" size={18} /></span>
          <input
            ref={input}
            type="search"
            value={query}
            onChange={e => search(e.target.value)}
            onFocus={() => { if (results) setShowResults(true); }}
            placeholder="Buscar"
            aria-label="Buscar pessoas, publicações e encontros"
            aria-expanded={showResults}
            aria-controls="search-results"
            autoComplete="off"
          />
          {loading && <span className="header-search-spinner" uk-spinner="ratio: 0.5"></span>}
          {showResults && results && (
            <div id="search-results" className="search-results" aria-live="polite">
              {total === 0 ? (
                <p className="search-empty">Nada encontrado para “{query.trim()}”.</p>
              ) : (
                <>
                  {results.members.length > 0 && (
                    <div>
                      <div className="search-group-label">Pessoas</div>
                      {results.members.map((m: any) => (
                        <Link key={m.id} to={`/profile/${m.id}`} className="search-item">
                          <Avatar name={m.name} profileImage={m.profileImage} size={32} />
                          <span className="search-item-text">
                            <span className="search-item-title">{m.name}</span>
                            {m.title && <span className="search-item-meta">{m.title}</span>}
                          </span>
                        </Link>
                      ))}
                    </div>
                  )}
                  {results.posts.length > 0 && (
                    <div>
                      <div className="search-group-label">Publicações</div>
                      {results.posts.map((p: any) => (
                        <Link key={p.id} to="/" className="search-item">
                          <span className="search-item-text">
                            <span className="search-item-title">{p.content}</span>
                            <span className="search-item-meta">{p.user?.name}</span>
                          </span>
                        </Link>
                      ))}
                    </div>
                  )}
                  {results.events.length > 0 && (
                    <div>
                      <div className="search-group-label">Agenda</div>
                      {results.events.map((e: any) => (
                        <Link key={e.id} to="/events" className="search-item">
                          <span className="search-item-text">
                            <span className="search-item-title">{e.title}</span>
                            <span className="search-item-meta">{new Date(e.startDate).toLocaleDateString('pt-BR', { day: 'numeric', month: 'short', year: 'numeric' })}</span>
                          </span>
                        </Link>
                      ))}
                    </div>
                  )}
                </>
              )}
            </div>
          )}
        </div>
      <button type="button" className="ghost-btn search-close" onClick={() => { setQuery(''); setResults(null); close(); }}>Cancelar</button>
    </div>
  );
};

/* ─── Notificações ──────────────────────────────────────────── */
const Notifications: React.FC = () => {
  const navigate = useNavigate();
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [open, setOpen] = useState(false);
  const [ringing, setRinging] = useState(false);
  const lastUnread = useRef(0);
  const button = useRef<HTMLButtonElement>(null);
  const panel = useRef<HTMLDivElement>(null);

  const load = async () => {
    try {
      const res = await api.getNotifications();
      if (res.success) {
        setNotifications(res.data.notifications);
        setUnreadCount(res.data.unreadCount);
      }
    } catch { /* tenta de novo no próximo ciclo */ }
  };

  useEffect(() => {
    load();
    const interval = setInterval(() => { if (document.visibilityState === 'visible') load(); }, 30000);
    return () => clearInterval(interval);
  }, []);

  // O sino toca uma vez quando o número de não lidas aumenta
  useEffect(() => {
    const grew = unreadCount > lastUnread.current;
    lastUnread.current = unreadCount;
    if (!grew) return;
    setRinging(true);
    const timer = setTimeout(() => setRinging(false), 900);
    return () => clearTimeout(timer);
  }, [unreadCount]);

  const close = () => {
    setOpen(false);
    button.current?.focus();
  };

  useDismiss(open, close, [button, panel]);

  const markAllRead = async () => {
    try {
      await api.markAllNotificationsRead();
      setNotifications(prev => prev.map(n => ({ ...n, isRead: true })));
      setUnreadCount(0);
    } catch { /* fica por ler */ }
  };

  const openNotification = (n: Notification) => {
    if (!n.isRead) {
      api.markNotificationRead(n.id).catch(() => {});
      setNotifications(prev => prev.map(item => item.id === n.id ? { ...item, isRead: true } : item));
      setUnreadCount(prev => Math.max(0, prev - 1));
    }
    const to = n.linkType ? NOTIFICATION_ROUTES[n.linkType] : undefined;
    if (to) {
      setOpen(false);
      navigate(to);
    }
  };

  const label = unreadCount > 0 ? `Notificações, ${unreadCount} não lidas` : 'Notificações';

  return (
    <div className="menu-wrap">
      <button ref={button} type="button" className={`icon-btn${ringing ? ' is-ringing' : ''}`} aria-label={label} title="Notificações"
        aria-haspopup="dialog" aria-expanded={open} onClick={() => { if (!open) load(); setOpen(v => !v); }}>
        <Icon name="bell" />
        {unreadCount > 0 && <span key={unreadCount} className="icon-btn-badge" aria-hidden="true">{badgeText(unreadCount)}</span>}
      </button>

      {open && (
        <div ref={panel} className="notif-panel scale-in" role="dialog" aria-label="Notificações">
          <div className="notif-head">
            <h2>Notificações</h2>
            {unreadCount > 0 && <button type="button" className="link-btn" onClick={markAllRead}>Marcar todas como lidas</button>}
          </div>
          <div className="notif-list">
            {notifications.length === 0 ? (
              <p className="notif-empty">Ainda não há notificações.</p>
            ) : notifications.map(n => (
              <button key={n.id} type="button" className={`notif-item${n.isRead ? '' : ' is-unread'}`} onClick={() => openNotification(n)}>
                <div className="notif-title">{n.title}</div>
                {n.body && <div className="notif-body">{n.body}</div>}
                <div className="notif-time" title={fullDate(n.createdAt)}>{timeAgo(n.createdAt)}</div>
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

/* ─── Conta: perfil, liderança, tema e sair ─────────────────── */
const AccountMenu: React.FC = () => {
  const { user, logout } = useAuth();
  const { theme, toggle: toggleTheme } = useTheme();
  const location = useLocation();
  const [open, setOpen] = useState(false);
  const button = useRef<HTMLButtonElement>(null);
  const menu = useRef<HTMLDivElement>(null);
  const isLeader = user?.role === 'leader' || user?.role === 'admin';

  const close = (refocus = true) => {
    setOpen(false);
    if (refocus) button.current?.focus();
  };

  useDismiss(open, () => close(), [button, menu]);
  useEffect(() => { setOpen(false); }, [location.pathname]);
  useEffect(() => { if (open) menu.current?.querySelector<HTMLElement>('[role^="menuitem"]')?.focus(); }, [open]);

  return (
    <div className="menu-wrap header-account">
      <button ref={button} type="button" className="avatar-btn" aria-label={`Conta de ${user?.name}`} title="Sua conta"
        aria-haspopup="menu" aria-expanded={open} onClick={() => setOpen(v => !v)}>
        <Avatar name={user?.name || ''} profileImage={user?.profileImage} size={36} />
      </button>

      {open && (
        <div ref={menu} className="menu is-end scale-in" role="menu" aria-label="Sua conta" style={{ minWidth: '260px' }}
          onKeyDown={e => { moveFocus(e, menu.current); if (e.key === 'Tab') close(false); }}>
          <div className="menu-head">
            <Avatar name={user?.name || ''} profileImage={user?.profileImage} size={40} />
            <div style={{ minWidth: 0 }}>
              <div className="menu-head-name truncate">{user?.name}</div>
              <div className="menu-head-role">{roleLabel(user?.role)}</div>
            </div>
          </div>
          <Link to={`/profile/${user?.id}`} role="menuitem" className="menu-item"><Icon name="user" size={18} /> Meu perfil</Link>
          {isLeader && (
            <>
              <div className="menu-divider" role="separator"></div>
              <div className="menu-label">Liderança</div>
              <Link to="/dashboard" role="menuitem" className="menu-item"><Icon name="dashboard" size={18} /> Painel do líder</Link>
              <Link to="/reports" role="menuitem" className="menu-item"><Icon name="reports" size={18} /> Relatórios</Link>
            </>
          )}
          <div className="menu-divider" role="separator"></div>
          <button type="button" role="menuitemcheckbox" aria-checked={theme === 'dark'} className="menu-item" onClick={toggleTheme}>
            <Icon name="moon" size={18} /> Tema escuro
            <span className={`switch${theme === 'dark' ? ' is-on' : ''}`} aria-hidden="true"></span>
          </button>
          <div className="menu-divider" role="separator"></div>
          <button type="button" role="menuitem" className="menu-item is-danger" onClick={logout}><Icon name="logout" size={18} /> Sair</button>
        </div>
      )}
    </div>
  );
};

/* ─── Cabeçalho ─────────────────────────────────────────────── */
const Header: React.FC<{ items: NavItem[]; guardian: boolean }> = ({ items, guardian }) => {
  const location = useLocation();
  const { openComposer } = useComposer();
  const [searchOpen, setSearchOpen] = useState(false);
  const searchToggle = useRef<HTMLButtonElement>(null);

  return (
    <header className="app-header">
      <div className="app-header-inner">
        <Link to="/" className="brand" aria-label="ICHURCH, ir para o início">ICHURCH</Link>
        {!guardian && <SearchBox open={searchOpen} setOpen={setSearchOpen} toggle={searchToggle} />}

        <nav className="main-nav" aria-label="Principal">
          {items.map(item => {
            const active = item.active(location.pathname);
            return (
              <Link key={item.to} to={item.to} className={`main-nav-link${active ? ' is-active' : ''}`} aria-current={active ? 'page' : undefined}
                onClick={() => { if (active && item.to === '/') window.scrollTo({ top: 0, behavior: 'smooth' }); }}>
                <Icon name={item.icon} size={20} />
                {item.label}
                {!!item.badge && <span className="nav-badge" aria-label={`${item.badge} não lidas`}>{badgeText(item.badge)}</span>}
              </Link>
            );
          })}
        </nav>

        <div className="header-actions">
          {!guardian && (
            <button ref={searchToggle} type="button" className="icon-btn search-toggle" aria-label="Buscar" aria-expanded={searchOpen}
              onClick={() => setSearchOpen(true)}>
              <Icon name="search" />
            </button>
          )}
          {!guardian && (
            <button type="button" className="uk-button uk-button-primary header-publish" onClick={() => openComposer()}>
              <Icon name="plus" size={18} strokeWidth={2} /> Publicar
            </button>
          )}
          <Notifications />
          <AccountMenu />
        </div>
      </div>
    </header>
  );
};

/* ─── Barra de baixo (telemóvel e tablet) ───────────────────── */
const BottomNav: React.FC<{ items: NavItem[]; guardian: boolean }> = ({ items, guardian }) => {
  const { user } = useAuth();
  const location = useLocation();
  const { openComposer } = useComposer();
  const path = location.pathname;
  const profileActive = path === '/profile' || path === `/profile/${user?.id}` || isLeaderPath(path);

  const link = (item: NavItem) => {
    const active = item.active(path);
    return (
      <Link key={item.to} to={item.to} className={`bottom-nav-link${active ? ' is-active' : ''}`} aria-current={active ? 'page' : undefined}>
        <span className="bottom-nav-icon"><Icon name={item.icon} size={24} strokeWidth={active ? 2 : 1.75} /></span>
        <span className="bottom-nav-label">{item.label}</span>
        {!!item.badge && <span className="nav-badge" aria-label={`${item.badge} não lidas`}>{badgeText(item.badge)}</span>}
      </Link>
    );
  };

  const profile = (
    <Link key="perfil" to={`/profile/${user?.id}`} className={`bottom-nav-link${profileActive ? ' is-active' : ''}`} aria-current={profileActive ? 'page' : undefined}>
      <span className="bottom-nav-icon"><Avatar name={user?.name || ''} profileImage={user?.profileImage} size={26} /></span>
      <span className="bottom-nav-label">Perfil</span>
    </Link>
  );

  if (guardian) {
    return <nav className="bottom-nav" aria-label="Principal" style={{ '--nav-items': 2 } as React.CSSProperties}>{items.map(link)}{profile}</nav>;
  }

  // Feed, Comunidade, Publicar, Bíblia, Mensagens (o perfil está no avatar, no cabeçalho)
  const [feed, community, bible, messages] = items;
  return (
    <nav className="bottom-nav" aria-label="Principal">
      {link(feed)}
      {link(community)}
      <button type="button" className="bottom-nav-link" onClick={() => openComposer()}>
        <span className="bottom-nav-icon"><span className="bottom-nav-publish"><Icon name="plus" size={22} strokeWidth={2.25} /></span></span>
        <span className="bottom-nav-label">Publicar</span>
      </button>
      {link(bible)}
      {link(messages)}
    </nav>
  );
};

const AppShell: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { user } = useAuth();
  const location = useLocation();
  const guardian = user?.role === 'guardian';
  const unread = useUnreadMessages(!guardian);

  // Página nova começa no topo (o feed repõe a posição dele quando se volta)
  useLayoutEffect(() => { window.scrollTo(0, 0); }, [location.pathname]);

  const items: NavItem[] = guardian
    ? [{ to: '/', label: 'Meus filhos', icon: 'users', active: p => p === '/' }]
    : [
        { to: '/', label: 'Feed', icon: 'home', active: p => p === '/' || p === '/posts' },
        { to: '/comunidade', label: 'Comunidade', icon: 'users', active: isCommunityPath },
        { to: '/biblia', label: 'Bíblia', icon: 'book', active: p => p.startsWith('/biblia') },
        { to: '/messages', label: 'Mensagens', icon: 'messages', active: p => p === '/messages' || p === '/chat', badge: unread },
      ];

  // Conversa aberta no telemóvel: ocupa o ecrã todo
  const immersive = location.pathname === '/chat' || (location.pathname === '/messages' && new URLSearchParams(location.search).has('c'));

  return (
    <ComposerProvider>
      <div className={`app${immersive ? ' is-immersive' : ''}`}>
        <a className="skip-link" href="#conteudo">Pular para o conteúdo</a>
        <Header items={items} guardian={guardian} />
        <main id="conteudo" className="app-main" tabIndex={-1}>{children}</main>
        <BottomNav items={items} guardian={guardian} />
      </div>
    </ComposerProvider>
  );
};

export default function App() {
  const { isAuthenticated, user } = useAuth();
  const location = useLocation();
  const isAuthPage = location.pathname === '/login' || location.pathname === '/register' || location.pathname.startsWith('/convite/');

  // Conta de responsável: só a área dos filhos e o próprio perfil
  const guardianRoutes = (
    <Routes>
      <Route path="/login" element={<Login />} />
      <Route path="/register" element={<Register />} />
      <Route path="/convite/:code" element={<InviteRegister />} />
      <Route path="/" element={<PrivateRoute><GuardianHome /></PrivateRoute>} />
      <Route path="/profile" element={<PrivateRoute><Profile /></PrivateRoute>} />
      <Route path="/profile/:userId" element={<PrivateRoute><Profile /></PrivateRoute>} />
      <Route path="*" element={<Navigate to="/" />} />
    </Routes>
  );

  const routes = user?.role === 'guardian' ? guardianRoutes : (
    <Routes>
      <Route path="/login" element={<Login />} />
      <Route path="/register" element={<Register />} />
      <Route path="/convite/:code" element={<InviteRegister />} />
      <Route path="/dashboard" element={<RoleRoute allowedRoles={['leader', 'admin']}><Dashboard /></RoleRoute>} />
      <Route path="/" element={<PrivateRoute><Feed /></PrivateRoute>} />
      <Route path="/posts" element={<PrivateRoute><Posts /></PrivateRoute>} />
      <Route path="/comunidade" element={<PrivateRoute><Community /></PrivateRoute>} />
      <Route path="/events" element={<PrivateRoute><Events /></PrivateRoute>} />
      <Route path="/chat" element={<PrivateRoute><Chat /></PrivateRoute>} />
      <Route path="/messages" element={<PrivateRoute><Messages /></PrivateRoute>} />
      <Route path="/biblia" element={<PrivateRoute><Bible /></PrivateRoute>} />
      <Route path="/biblia/:book/:chapter" element={<PrivateRoute><Bible /></PrivateRoute>} />
      <Route path="/users" element={<PrivateRoute><Users /></PrivateRoute>} />
      <Route path="/reports" element={<RoleRoute allowedRoles={['leader', 'admin']}><Reports /></RoleRoute>} />
      <Route path="/profile/:userId" element={<PrivateRoute><Profile /></PrivateRoute>} />
      <Route path="/profile" element={<PrivateRoute><Profile /></PrivateRoute>} />
      <Route path="*" element={<Navigate to="/" />} />
    </Routes>
  );

  return (
    <ErrorBoundary>
      {isAuthenticated && !isAuthPage ? <AppShell>{routes}</AppShell> : routes}
    </ErrorBoundary>
  );
}
