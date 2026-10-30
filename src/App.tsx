import React, { useState, useEffect, useRef, Component } from 'react';
import { Routes, Route, Navigate, Link, useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from './context/AuthContext';
import { useTheme } from './context/ThemeContext';
import { api } from './services/api';
import ToastContainer from './components/ToastContainer';
import Avatar from './components/Avatar';

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
        <div style={{ padding: '40px 24px', maxWidth: '800px', margin: '0 auto' }}>
          <div className="card" style={{ padding: '20px', marginBottom: '16px' }}>
            <div style={{ fontWeight: 700, color: 'var(--text)', fontSize: '14px', marginBottom: '8px' }}>
              Erro na renderização — copie esta mensagem e informe ao suporte
            </div>
            <div style={{ color: 'var(--text-muted)', fontSize: '13px', wordBreak: 'break-all' }}>
              {this.state.error.message}
            </div>
          </div>
          <pre className="card" style={{ background: 'var(--bg-surface)', padding: '16px', fontSize: '12px', overflow: 'auto', color: 'var(--text-muted)' }}>
            {this.state.error.stack}
          </pre>
          <button className="uk-button uk-button-primary" style={{ marginTop: '16px' }}
            onClick={() => { this.setState({ error: null }); window.location.reload(); }}>
            Recarregar
          </button>
        </div>
      );
    }
    return this.props.children;
  }
}

import Login from './pages/Login';
import Register from './pages/Register';
import Feed from './pages/Feed';
import Posts from './pages/Posts';
import Devotionals from './pages/Devotionals';
import Users from './pages/Users';
import Dashboard from './pages/Dashboard';
import Profile from './pages/Profile';
import Chat from './pages/Chat';
import Events from './pages/Events';
import Prayers from './pages/Prayers';
import Reports from './pages/Reports';
import Sermons from './pages/Sermons';
import Groups from './pages/Groups';

const PrivateRoute: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { isAuthenticated, isLoading } = useAuth();
  if (isLoading) return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100vh' }}>
      <div uk-spinner="ratio: 2"></div>
    </div>
  );
  if (!isAuthenticated) return <Navigate to="/login" />;
  return <>{children}</>;
};

const RoleRoute: React.FC<{ children: React.ReactNode; allowedRoles: string[] }> = ({ children, allowedRoles }) => {
  const { isAuthenticated, isLoading, user } = useAuth();
  if (isLoading) return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100vh' }}>
      <div uk-spinner="ratio: 2"></div>
    </div>
  );
  if (!isAuthenticated) return <Navigate to="/login" />;
  if (!user || !allowedRoles.includes(user.role)) return <Navigate to="/" />;
  return <>{children}</>;
};

interface Notification { id: string; type: string; title: string; body: string; isRead: boolean; createdAt: string; linkType?: string | null; linkId?: string | null; }

// Página aberta ao clicar numa notificação
const NOTIFICATION_ROUTES: Record<string, string> = {
  post: '/',
  poll: '/',
  event: '/events',
  prayer_request: '/prayers',
  devotional: '/devotionals',
  sermon: '/sermons',
  group: '/groups',
};

interface SearchResults {
  posts: any[];
  members: any[];
  events: any[];
  sermons: any[];
}

const COMMUNITY_LINKS = [
  { to: '/', icon: 'rss', label: 'Feed' },
  { to: '/posts', icon: 'pencil', label: 'Post' },
  { to: '/events', icon: 'calendar', label: 'Agenda' },
  { to: '/prayers', icon: 'heart', label: 'Oração' },
  { to: '/devotionals', icon: 'file-text', label: 'Devocionais' },
  { to: '/sermons', icon: 'bookmark', label: 'Pregações' },
  { to: '/groups', icon: 'users', label: 'Células' },
  { to: '/chat', icon: 'commenting', label: 'Chat' },
  { to: '/users', icon: 'user', label: 'Membros' },
];

const LEADER_LINKS = [
  { to: '/dashboard', icon: 'grid', label: 'Painel' },
  { to: '/reports', icon: 'table', label: 'Relatórios' },
];

const roleLabel = (role?: string) => role === 'admin' ? 'Administrador' : role === 'leader' ? 'Líder' : 'Membro';

/* ─── Barra lateral ─────────────────────────────────────────── */
const Sidebar: React.FC<{ open: boolean; onClose: () => void }> = ({ open, onClose }) => {
  const { user, logout } = useAuth();
  const location = useLocation();
  const [showMenu, setShowMenu] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);
  const isLeaderOrAdmin = user?.role === 'leader' || user?.role === 'admin';

  useEffect(() => { setShowMenu(false); }, [location.pathname]);

  useEffect(() => {
    const handleClick = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) setShowMenu(false);
    };
    document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, []);

  const renderLink = (link: { to: string; icon: string; label: string }) => (
    <Link key={link.to} to={link.to} className={`sidebar-link${location.pathname === link.to ? ' is-active' : ''}`}>
      <span uk-icon={`icon: ${link.icon}; ratio: 0.85`}></span>
      {link.label}
    </Link>
  );

  return (
    <>
      <div className={`sidebar-overlay${open ? ' is-open' : ''}`} onClick={onClose}></div>
      <aside className={`app-sidebar${open ? ' is-open' : ''}`}>
        <Link to="/" className="sidebar-brand">ICHURCH</Link>

        <nav className="sidebar-nav">
          {COMMUNITY_LINKS.map(renderLink)}
          {isLeaderOrAdmin && (
            <>
              <div className="sidebar-section">Liderança</div>
              {LEADER_LINKS.map(renderLink)}
            </>
          )}
        </nav>

        <div className="sidebar-user" ref={menuRef}>
          {showMenu && (
            <div className="sidebar-user-menu scale-in">
              <Link to={`/profile/${user?.id}`} className="menu-link">
                <span uk-icon="icon: user; ratio: 0.8"></span>
                Meu Perfil
              </Link>
              <div className="menu-divider"></div>
              <button className="uk-button uk-button-danger uk-button-small" onClick={logout}>
                <span uk-icon="icon: sign-out; ratio: 0.8"></span>
                Sair
              </button>
            </div>
          )}
          <button className={`sidebar-user-btn${showMenu ? ' is-open' : ''}`} onClick={() => setShowMenu(v => !v)}>
            <Avatar name={user?.name || ''} profileImage={user?.profileImage} size="small" />
            <span style={{ flex: 1, minWidth: 0 }}>
              <span className="sidebar-user-name">{user?.name}</span>
              <span className="sidebar-user-role">{roleLabel(user?.role)}</span>
            </span>
            <span uk-icon={`icon: ${showMenu ? 'chevron-down' : 'chevron-up'}; ratio: 0.7`}></span>
          </button>
        </div>
      </aside>
    </>
  );
};

/* ─── Barra superior ────────────────────────────────────────── */
const Topbar: React.FC<{ onMenu: () => void }> = ({ onMenu }) => {
  const { theme, toggle: toggleTheme } = useTheme();
  const navigate = useNavigate();
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [ringing, setRinging] = useState(false);
  const lastUnread = useRef(0);

  // O sino toca uma vez quando o número de não lidas aumenta
  useEffect(() => {
    const grew = unreadCount > lastUnread.current;
    lastUnread.current = unreadCount;
    if (!grew) return;
    setRinging(true);
    const timer = setTimeout(() => setRinging(false), 900);
    return () => clearTimeout(timer);
  }, [unreadCount]);
  const [showNotifs, setShowNotifs] = useState(false);
  const notifRef = useRef<HTMLDivElement>(null);

  const [searchQ, setSearchQ] = useState('');
  const [searchResults, setSearchResults] = useState<SearchResults | null>(null);
  const [searchLoading, setSearchLoading] = useState(false);
  const [showSearch, setShowSearch] = useState(false);
  const searchRef = useRef<HTMLDivElement>(null);
  const searchTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const loadNotifications = async () => {
    try {
      const res = await api.getNotifications();
      if (res.success) {
        setNotifications(res.data.notifications);
        setUnreadCount(res.data.unreadCount);
      }
    } catch { /* silent */ }
  };

  useEffect(() => {
    loadNotifications();
    const interval = setInterval(loadNotifications, 30000);
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    const handleClick = (e: MouseEvent) => {
      if (notifRef.current && !notifRef.current.contains(e.target as Node)) setShowNotifs(false);
      if (searchRef.current && !searchRef.current.contains(e.target as Node)) setShowSearch(false);
    };
    document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, []);

  const handleMarkAllRead = async () => {
    try {
      await api.markAllNotificationsRead();
      setNotifications(prev => prev.map(n => ({ ...n, isRead: true })));
      setUnreadCount(0);
    } catch { /* silent */ }
  };

  const handleMarkRead = async (id: string) => {
    try {
      await api.markNotificationRead(id);
      setNotifications(prev => prev.map(n => n.id === id ? { ...n, isRead: true } : n));
      setUnreadCount(prev => Math.max(0, prev - 1));
    } catch { /* silent */ }
  };

  const openNotification = (n: Notification) => {
    if (!n.isRead) handleMarkRead(n.id);
    const to = n.linkType ? NOTIFICATION_ROUTES[n.linkType] : undefined;
    if (to) {
      setShowNotifs(false);
      navigate(to);
    }
  };

  const handleSearchChange = (q: string) => {
    setSearchQ(q);
    if (searchTimer.current) clearTimeout(searchTimer.current);
    if (q.trim().length < 2) { setSearchResults(null); setShowSearch(false); return; }
    searchTimer.current = setTimeout(async () => {
      setSearchLoading(true);
      try {
        const res = await api.search(q.trim());
        if (res.success) { setSearchResults(res.data); setShowSearch(true); }
      } catch { /* silent */ }
      finally { setSearchLoading(false); }
    }, 320);
  };

  const closeSearch = () => { setShowSearch(false); setSearchQ(''); };

  const totalResults = searchResults
    ? (searchResults.posts.length + searchResults.members.length + searchResults.events.length + searchResults.sermons.length)
    : 0;

  return (
    <header className="app-topbar">
      <button className="icon-btn topbar-menu-btn" onClick={onMenu} title="Menu">
        <span uk-icon="icon: menu; ratio: 0.9"></span>
      </button>

      <div className="topbar-search" ref={searchRef}>
        <span className="topbar-search-icon" uk-icon="icon: search; ratio: 0.8"></span>
        <input
          value={searchQ}
          onChange={e => handleSearchChange(e.target.value)}
          onFocus={() => { if (searchResults && totalResults > 0) setShowSearch(true); }}
          placeholder="Buscar membros, posts, eventos..."
        />
        {searchLoading && <span className="topbar-search-spinner" uk-spinner="ratio: 0.5"></span>}

        {showSearch && searchResults && totalResults > 0 && (
          <div className="search-results">
            {searchResults.members.length > 0 && (
              <div>
                <div className="search-group-label">Membros</div>
                {searchResults.members.map((m: any) => (
                  <Link key={m.id} to={`/profile/${m.id}`} onClick={closeSearch} className="search-item">
                    <span uk-icon="icon: user; ratio: 0.8"></span>
                    <span className="search-item-title">{m.name}</span>
                    {m.title && <span className="search-item-meta">{m.title}</span>}
                  </Link>
                ))}
              </div>
            )}
            {searchResults.posts.length > 0 && (
              <div>
                <div className="search-group-label">Posts</div>
                {searchResults.posts.map((p: any) => (
                  <Link key={p.id} to="/" onClick={closeSearch} className="search-item is-stacked">
                    <span className="search-item-title">{p.content}</span>
                    <span className="search-item-meta">{p.user?.name}</span>
                  </Link>
                ))}
              </div>
            )}
            {searchResults.events.length > 0 && (
              <div>
                <div className="search-group-label">Eventos</div>
                {searchResults.events.map((e: any) => (
                  <Link key={e.id} to="/events" onClick={closeSearch} className="search-item is-stacked">
                    <span className="search-item-title">{e.title}</span>
                    <span className="search-item-meta">{new Date(e.startDate).toLocaleDateString('pt-BR')}</span>
                  </Link>
                ))}
              </div>
            )}
            {searchResults.sermons.length > 0 && (
              <div>
                <div className="search-group-label">Pregações</div>
                {searchResults.sermons.map((s: any) => (
                  <Link key={s.id} to="/sermons" onClick={closeSearch} className="search-item is-stacked">
                    <span className="search-item-title">{s.title}</span>
                    <span className="search-item-meta">{s.speaker}</span>
                  </Link>
                ))}
              </div>
            )}
          </div>
        )}
      </div>

      <div className="topbar-actions">
        <button className="icon-btn" onClick={toggleTheme} title={theme === 'dark' ? 'Modo claro' : 'Modo escuro'}>
          <span key={theme} className="icon-swap">
            {theme === 'dark' ? (
              <svg width="17" height="17" viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.1" aria-hidden="true">
                <circle cx="10" cy="10" r="3.5" />
                <path d="M10 1.5v2.5M10 16v2.5M1.5 10H4M16 10h2.5M4 4l1.8 1.8M14.2 14.2 16 16M4 16l1.8-1.8M14.2 5.8 16 4" />
              </svg>
            ) : (
              <svg width="17" height="17" viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.1" aria-hidden="true">
                <path d="M16.5 12.6A7 7 0 1 1 7.4 3.5a5.6 5.6 0 0 0 9.1 9.1Z" />
              </svg>
            )}
          </span>
        </button>

        <div ref={notifRef} style={{ position: 'relative' }}>
          <button className={`icon-btn${showNotifs ? ' is-active' : ''}${ringing ? ' is-ringing' : ''}`} onClick={() => { if (!showNotifs) loadNotifications(); setShowNotifs(v => !v); }} title="Notificações">
            <span uk-icon="icon: bell; ratio: 0.85"></span>
            {unreadCount > 0 && <span key={unreadCount} className="icon-btn-badge">{unreadCount > 9 ? '9+' : unreadCount}</span>}
          </button>

          {showNotifs && (
            <div className="notif-panel scale-in">
              <div className="notif-head">
                <span>Notificações</span>
                {unreadCount > 0 && (
                  <button className="link-btn" onClick={handleMarkAllRead}>Marcar todas lidas</button>
                )}
              </div>
              <div className="notif-list">
                {notifications.length === 0 ? (
                  <div className="notif-empty">Nenhuma notificação</div>
                ) : (
                  notifications.map(n => (
                    <div key={n.id} onClick={() => openNotification(n)}
                      className={`notif-item${n.isRead ? '' : ' is-unread'}`}>
                      <div className="notif-title">{n.title}</div>
                      <div className="notif-body">{n.body}</div>
                      <div className="notif-time">
                        {new Date(n.createdAt).toLocaleDateString('pt-BR', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' })}
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>
          )}
        </div>
      </div>
    </header>
  );
};

const AppShell: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const location = useLocation();

  useEffect(() => { setSidebarOpen(false); }, [location.pathname]);

  return (
    <div className="app-layout">
      <Sidebar open={sidebarOpen} onClose={() => setSidebarOpen(false)} />
      <div className="app-main">
        <Topbar onMenu={() => setSidebarOpen(true)} />
        <main className="app-content">
          <div className="app-container">{children}</div>
        </main>
      </div>
    </div>
  );
};

export default function App() {
  const { isAuthenticated } = useAuth();
  const location = useLocation();
  const isAuthPage = location.pathname === '/login' || location.pathname === '/register';

  const routes = (
    <Routes>
      <Route path="/login" element={<Login />} />
      <Route path="/register" element={<Register />} />
      <Route path="/dashboard" element={<RoleRoute allowedRoles={['leader', 'admin']}><Dashboard /></RoleRoute>} />
      <Route path="/" element={<PrivateRoute><Feed /></PrivateRoute>} />
      <Route path="/posts" element={<PrivateRoute><Posts /></PrivateRoute>} />
      <Route path="/events" element={<PrivateRoute><Events /></PrivateRoute>} />
      <Route path="/prayers" element={<PrivateRoute><Prayers /></PrivateRoute>} />
      <Route path="/devotionals" element={<PrivateRoute><Devotionals /></PrivateRoute>} />
      <Route path="/sermons" element={<PrivateRoute><Sermons /></PrivateRoute>} />
      <Route path="/groups" element={<PrivateRoute><Groups /></PrivateRoute>} />
      <Route path="/chat" element={<PrivateRoute><Chat /></PrivateRoute>} />
      <Route path="/users" element={<PrivateRoute><Users /></PrivateRoute>} />
      <Route path="/reports" element={<RoleRoute allowedRoles={['leader', 'admin']}><Reports /></RoleRoute>} />
      <Route path="/profile/:userId" element={<PrivateRoute><Profile /></PrivateRoute>} />
      <Route path="/profile" element={<PrivateRoute><Profile /></PrivateRoute>} />
      <Route path="*" element={<Navigate to="/" />} />
    </Routes>
  );

  return (
    <ErrorBoundary>
      <ToastContainer />
      {isAuthenticated && !isAuthPage ? <AppShell>{routes}</AppShell> : routes}
    </ErrorBoundary>
  );
}
