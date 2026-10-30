import React, { useState, useEffect, useRef, Component, useCallback } from 'react';
import { Routes, Route, Navigate, Link, useLocation } from 'react-router-dom';
import { useAuth } from './context/AuthContext';
import { useTheme } from './context/ThemeContext';
import { useToast } from './context/ToastContext';
import { api } from './services/api';
import ToastContainer from './components/ToastContainer';

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
        <div style={{ padding: '40px 24px', fontFamily: 'monospace', maxWidth: '800px', margin: '0 auto' }}>
          <div style={{ background: '#fef2f2', border: '1px solid #fca5a5', padding: '20px', marginBottom: '16px' }}>
            <div style={{ fontWeight: 700, color: '#dc2626', fontSize: '14px', marginBottom: '8px' }}>
              Erro na renderização — copie esta mensagem e informe ao suporte
            </div>
            <div style={{ color: '#7f1d1d', fontSize: '13px', wordBreak: 'break-all' }}>
              {this.state.error.message}
            </div>
          </div>
          <pre style={{ background: '#f8fafc', border: '1px solid #e2e8f0', padding: '16px', fontSize: '12px', overflow: 'auto', color: '#334155' }}>
            {this.state.error.stack}
          </pre>
          <button onClick={() => { this.setState({ error: null }); window.location.reload(); }}
            style={{ marginTop: '16px', padding: '8px 16px', background: '#1e87f0', color: 'white', border: 'none', cursor: 'pointer', fontSize: '13px', fontFamily: 'inherit' }}>
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

interface Notification { id: string; type: string; title: string; body: string; isRead: boolean; createdAt: string; }

interface SearchResults {
  posts: any[];
  members: any[];
  events: any[];
  sermons: any[];
}

const Navbar = () => {
  const { user, logout } = useAuth();
  const { theme, toggle: toggleTheme } = useTheme();
  const location = useLocation();
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [showNotifs, setShowNotifs] = useState(false);
  const notifRef = useRef<HTMLDivElement>(null);
  const notifBtnRef = useRef<HTMLButtonElement>(null);
  const [notifPos, setNotifPos] = useState({ top: 60, right: 20 });

  // Search
  const [searchQ, setSearchQ] = useState('');
  const [searchResults, setSearchResults] = useState<SearchResults | null>(null);
  const [searchLoading, setSearchLoading] = useState(false);
  const [showSearch, setShowSearch] = useState(false);
  const searchRef = useRef<HTMLDivElement>(null);
  const searchBtnRef = useRef<HTMLInputElement>(null);
  const [searchPos, setSearchPos] = useState({ top: 60, left: 0, width: 320 });
  const searchTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const isActive = (path: string) => location.pathname === path ? 'uk-active' : '';
  const isLeaderOrAdmin = user?.role === 'leader' || user?.role === 'admin';

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

  const updateSearchPos = () => {
    if (searchBtnRef.current) {
      const r = searchBtnRef.current.getBoundingClientRect();
      setSearchPos({ top: r.bottom + 6, left: r.left, width: Math.max(r.width, 320) });
    }
  };

  const totalResults = searchResults
    ? (searchResults.posts.length + searchResults.members.length + searchResults.events.length + searchResults.sermons.length)
    : 0;

  return (
    <div uk-sticky="sel-target: .uk-navbar-container; cls-active: uk-navbar-sticky">
      <nav className="uk-navbar-container" uk-navbar="">
        <div className="uk-navbar-left" style={{ paddingLeft: '20px' }}>
          <Link to="/" className="uk-navbar-item uk-logo">ICHURCH</Link>
          <ul className="uk-navbar-nav">
            {isLeaderOrAdmin && (
              <li className={isActive('/dashboard')}>
                <Link to="/dashboard"><span uk-icon="icon: grid; ratio: 0.8"></span> Painel</Link>
              </li>
            )}
            <li className={isActive('/')}><Link to="/"><span uk-icon="icon: rss; ratio: 0.8"></span> Feed</Link></li>
            <li className={isActive('/posts')}><Link to="/posts"><span uk-icon="icon: pencil; ratio: 0.8"></span> Post</Link></li>
            <li className={isActive('/events')}><Link to="/events"><span uk-icon="icon: calendar; ratio: 0.8"></span> Agenda</Link></li>
            <li className={isActive('/prayers')}><Link to="/prayers"><span uk-icon="icon: heart; ratio: 0.8"></span> Oração</Link></li>
            <li className={isActive('/devotionals')}><Link to="/devotionals"><span uk-icon="icon: book; ratio: 0.8"></span> Devoc.</Link></li>
            <li className={isActive('/sermons')}><Link to="/sermons"><span uk-icon="icon: bookmark; ratio: 0.8"></span> Pregações</Link></li>
            <li className={isActive('/groups')}><Link to="/groups"><span uk-icon="icon: users; ratio: 0.8"></span> Células</Link></li>
            <li className={isActive('/chat')}><Link to="/chat"><span uk-icon="icon: commenting; ratio: 0.8"></span> Chat</Link></li>
            <li className={isActive('/users')}><Link to="/users"><span uk-icon="icon: user; ratio: 0.8"></span> Membros</Link></li>
            {isLeaderOrAdmin && (
              <li className={isActive('/reports')}>
                <Link to="/reports"><span uk-icon="icon: bar-chart; ratio: 0.8"></span> Relatórios</Link>
              </li>
            )}
          </ul>
        </div>

        <div className="uk-navbar-right" style={{ paddingRight: '16px', display: 'flex', alignItems: 'center', gap: '4px' }}>
          {/* Search */}
          <div ref={searchRef} style={{ position: 'relative' }}>
            <div style={{ position: 'relative', display: 'flex', alignItems: 'center' }}>
              <span uk-icon="icon: search; ratio: 0.8" style={{ position: 'absolute', left: '8px', color: 'rgba(255,255,255,0.4)', pointerEvents: 'none' }}></span>
              <input
                ref={searchBtnRef}
                value={searchQ}
                onChange={e => { handleSearchChange(e.target.value); updateSearchPos(); }}
                onFocus={() => { updateSearchPos(); if (searchResults && totalResults > 0) setShowSearch(true); }}
                placeholder="Buscar..."
                style={{ background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.1)', color: 'rgba(255,255,255,0.8)', fontSize: '12px', padding: '6px 10px 6px 28px', width: '160px', outline: 'none', transition: 'width 200ms ease, border-color 200ms ease' }}
                onMouseEnter={e => (e.currentTarget.style.width = '200px')}
                onMouseLeave={e => { if (document.activeElement !== e.currentTarget) e.currentTarget.style.width = '160px'; }}
              />
              {searchLoading && <span uk-spinner="ratio: 0.6" style={{ position: 'absolute', right: '8px', color: 'rgba(255,255,255,0.5)' }}></span>}
            </div>

            {showSearch && searchResults && totalResults > 0 && (
              <div className="search-results" style={{ top: searchPos.top, left: searchPos.left, width: `${searchPos.width}px`, maxHeight: '400px', overflowY: 'auto' }}>
                {searchResults.members.length > 0 && (
                  <div>
                    <div style={{ padding: '8px 12px 4px', fontSize: '10px', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.07em', color: 'var(--text-faint)' }}>Membros</div>
                    {searchResults.members.map((m: any) => (
                      <Link key={m.id} to={`/profile/${m.id}`} onClick={() => { setShowSearch(false); setSearchQ(''); }}
                        style={{ display: 'flex', alignItems: 'center', gap: '10px', padding: '8px 12px', textDecoration: 'none', transition: 'background var(--t)' }}
                        onMouseEnter={e => (e.currentTarget.style.background = 'var(--bg-surface)')}
                        onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}>
                        <span uk-icon="icon: user; ratio: 0.8" style={{ color: 'var(--text-faint)' }}></span>
                        <span style={{ fontSize: '13px', color: 'var(--text)' }}>{m.name}</span>
                        {m.title && <span style={{ fontSize: '11px', color: 'var(--text-faint)' }}>{m.title}</span>}
                      </Link>
                    ))}
                  </div>
                )}
                {searchResults.posts.length > 0 && (
                  <div>
                    <div style={{ padding: '8px 12px 4px', fontSize: '10px', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.07em', color: 'var(--text-faint)' }}>Posts</div>
                    {searchResults.posts.map((p: any) => (
                      <Link key={p.id} to="/" onClick={() => { setShowSearch(false); setSearchQ(''); }}
                        style={{ display: 'block', padding: '8px 12px', textDecoration: 'none', transition: 'background var(--t)' }}
                        onMouseEnter={e => (e.currentTarget.style.background = 'var(--bg-surface)')}
                        onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}>
                        <div style={{ fontSize: '12px', color: 'var(--text)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{p.content}</div>
                        <div style={{ fontSize: '11px', color: 'var(--text-faint)' }}>{p.user?.name}</div>
                      </Link>
                    ))}
                  </div>
                )}
                {searchResults.events.length > 0 && (
                  <div>
                    <div style={{ padding: '8px 12px 4px', fontSize: '10px', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.07em', color: 'var(--text-faint)' }}>Eventos</div>
                    {searchResults.events.map((e: any) => (
                      <Link key={e.id} to="/events" onClick={() => { setShowSearch(false); setSearchQ(''); }}
                        style={{ display: 'block', padding: '8px 12px', textDecoration: 'none', transition: 'background var(--t)' }}
                        onMouseEnter={ev => (ev.currentTarget.style.background = 'var(--bg-surface)')}
                        onMouseLeave={ev => (ev.currentTarget.style.background = 'transparent')}>
                        <div style={{ fontSize: '12px', color: 'var(--text)' }}>{e.title}</div>
                        <div style={{ fontSize: '11px', color: 'var(--text-faint)' }}>{new Date(e.startDate).toLocaleDateString('pt-BR')}</div>
                      </Link>
                    ))}
                  </div>
                )}
                {searchResults.sermons.length > 0 && (
                  <div>
                    <div style={{ padding: '8px 12px 4px', fontSize: '10px', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.07em', color: 'var(--text-faint)' }}>Pregações</div>
                    {searchResults.sermons.map((s: any) => (
                      <Link key={s.id} to="/sermons" onClick={() => { setShowSearch(false); setSearchQ(''); }}
                        style={{ display: 'block', padding: '8px 12px', textDecoration: 'none', transition: 'background var(--t)' }}
                        onMouseEnter={e => (e.currentTarget.style.background = 'var(--bg-surface)')}
                        onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}>
                        <div style={{ fontSize: '12px', color: 'var(--text)' }}>{s.title}</div>
                        <div style={{ fontSize: '11px', color: 'var(--text-faint)' }}>{s.speaker}</div>
                      </Link>
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Dark mode toggle */}
          <button
            onClick={toggleTheme}
            title={theme === 'dark' ? 'Modo claro' : 'Modo escuro'}
            style={{ width: '36px', height: '36px', border: '1px solid rgba(255,255,255,0.12)', background: 'transparent', color: 'rgba(255,255,255,0.7)', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', transition: 'all 160ms ease' }}
            onMouseEnter={e => (e.currentTarget.style.background = 'rgba(255,255,255,0.08)')}
            onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}
          >
            <span uk-icon={`icon: ${theme === 'dark' ? 'sun' : 'moon'}; ratio: 0.9`}></span>
          </button>

          {/* Notifications Bell */}
          <div ref={notifRef} style={{ position: 'relative' }}>
            <button
              ref={notifBtnRef}
              onClick={() => {
                if (notifBtnRef.current) {
                  const r = notifBtnRef.current.getBoundingClientRect();
                  setNotifPos({ top: r.bottom + 6, right: window.innerWidth - r.right });
                }
                setShowNotifs(v => !v);
              }}
              style={{ width: '36px', height: '36px', border: '1px solid rgba(255,255,255,0.12)', background: showNotifs ? 'rgba(30,135,240,0.15)' : 'transparent', color: 'rgba(255,255,255,0.7)', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', position: 'relative', transition: 'all 160ms ease' }}
              onMouseEnter={e => e.currentTarget.style.background = 'rgba(255,255,255,0.08)'}
              onMouseLeave={e => { if (!showNotifs) e.currentTarget.style.background = 'transparent'; }}>
              <span uk-icon="icon: bell; ratio: 0.9"></span>
              {unreadCount > 0 && (
                <span style={{ position: 'absolute', top: '4px', right: '4px', width: '16px', height: '16px', background: 'var(--danger)', color: 'white', fontSize: '10px', fontWeight: 700, display: 'flex', alignItems: 'center', justifyContent: 'center', borderRadius: '50%' }}>
                  {unreadCount > 9 ? '9+' : unreadCount}
                </span>
              )}
            </button>

            {showNotifs && (
              <div className="scale-in" style={{ position: 'fixed', top: notifPos.top, right: notifPos.right, width: '320px', background: 'var(--bg)', border: '1px solid var(--border-strong)', zIndex: 9999 }}>
                <div style={{ padding: '12px 16px', borderBottom: '1px solid var(--border)', display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: 'var(--bg-surface)' }}>
                  <span style={{ fontSize: '13px', fontWeight: 700, color: 'var(--text)' }}>Notificações</span>
                  {unreadCount > 0 && (
                    <button onClick={handleMarkAllRead} style={{ fontSize: '11px', color: 'var(--accent)', background: 'none', border: 'none', cursor: 'pointer', fontWeight: 600, fontFamily: 'inherit' }}>
                      Marcar todas lidas
                    </button>
                  )}
                </div>
                <div style={{ maxHeight: '360px', overflowY: 'auto' }}>
                  {notifications.length === 0 ? (
                    <div style={{ padding: '32px 16px', textAlign: 'center', color: 'var(--text-faint)', fontSize: '13px' }}>
                      Nenhuma notificação
                    </div>
                  ) : (
                    notifications.map(n => (
                      <div key={n.id} onClick={() => !n.isRead && handleMarkRead(n.id)}
                        style={{ padding: '12px 16px', borderBottom: '1px solid var(--border)', background: n.isRead ? 'transparent' : 'var(--accent-light)', cursor: n.isRead ? 'default' : 'pointer', transition: 'background 160ms ease' }}>
                        <div style={{ fontSize: '13px', fontWeight: n.isRead ? 400 : 600, color: 'var(--text)', marginBottom: '2px' }}>{n.title}</div>
                        <div style={{ fontSize: '12px', color: 'var(--text-muted)', lineHeight: 1.4 }}>{n.body}</div>
                        <div style={{ fontSize: '11px', color: 'var(--text-faint)', marginTop: '4px' }}>
                          {new Date(n.createdAt).toLocaleDateString('pt-BR', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' })}
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </div>
            )}
          </div>

          {/* User menu */}
          <ul className="uk-navbar-nav">
            <li>
              <a href="#" style={{ display: 'flex', alignItems: 'center', gap: '8px', height: '56px', padding: '0 12px' }}>
                {user?.profileImage ? (
                  <img src={user.profileImage} alt={user.name} style={{ width: '28px', height: '28px', borderRadius: '50%', objectFit: 'cover', border: '1px solid rgba(255,255,255,0.15)' }} />
                ) : (
                  <div style={{ width: '28px', height: '28px', background: 'rgba(30,135,240,0.2)', border: '1px solid rgba(30,135,240,0.4)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    <span uk-icon="icon: user; ratio: 0.75" style={{ color: 'var(--accent)' }}></span>
                  </div>
                )}
                <span className="uk-visible@m" style={{ color: 'var(--nav-text)', fontSize: '13px', fontWeight: 500 }}>{user?.name}</span>
                <span uk-icon="icon: chevron-down; ratio: 0.7" style={{ color: 'var(--nav-text)' }}></span>
              </a>
              <div className="uk-navbar-dropdown uk-navbar-dropdown-bottom-right">
                <ul className="uk-nav uk-navbar-dropdown-nav">
                  <li className="uk-nav-header">Minha Conta</li>
                  <li>
                    <Link to={`/profile/${user?.id}`}>
                      <span uk-icon="icon: user; ratio: 0.8" style={{ marginRight: '8px' }}></span>
                      Meu Perfil
                    </Link>
                  </li>
                  <li className="uk-nav-divider"></li>
                  <li>
                    <a href="#" onClick={e => { e.preventDefault(); logout(); }} style={{ color: 'var(--danger)' }}>
                      <span uk-icon="icon: sign-out; ratio: 0.8" style={{ marginRight: '8px' }}></span>
                      Sair
                    </a>
                  </li>
                </ul>
              </div>
            </li>
          </ul>
        </div>
      </nav>
    </div>
  );
};

export default function App() {
  const { isAuthenticated } = useAuth();

  return (
    <ErrorBoundary>
      <div>
        {isAuthenticated && <Navbar />}
        <ToastContainer />
        <main className={isAuthenticated ? 'uk-section uk-section-xsmall' : ''}>
          <div className="uk-container">
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
          </div>
        </main>
      </div>
    </ErrorBoundary>
  );
}
