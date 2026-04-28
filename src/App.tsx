import React from 'react';
import { Routes, Route, Navigate, Link, useLocation } from 'react-router-dom';
import { useAuth } from './context/AuthContext';

// Pages
import Login from './pages/Login';
import Register from './pages/Register';
import Feed from './pages/Feed';
import Devotionals from './pages/Devotionals';
import Users from './pages/Users';

const PrivateRoute: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { isAuthenticated, isLoading } = useAuth();

  if (isLoading) return <div className="uk-flex uk-flex-center uk-flex-middle" style={{ height: '100vh' }}><div uk-spinner="ratio: 3"></div></div>;
  if (!isAuthenticated) return <Navigate to="/login" />;

  return <>{children}</>;
};

const Navbar = () => {
  const { user, logout } = useAuth();
  const location = useLocation();

  const isActive = (path: string) => location.pathname === path ? 'uk-active' : '';

  return (
    <div uk-sticky="sel-target: .uk-navbar-container; cls-active: uk-navbar-sticky">
      <nav className="uk-navbar-container uk-navbar-transparent" uk-navbar="">
        <div className="uk-navbar-left uk-margin-left">
          <Link to="/" className="uk-navbar-item uk-logo uk-text-bold" style={{ color: '#1e87f0' }}>
            Ichurch
          </Link>
          <ul className="uk-navbar-nav uk-visible@m">
            <li className={isActive('/')}><Link to="/">Feed</Link></li>
            <li className={isActive('/devotionals')}><Link to="/devotionals">Devocionais</Link></li>
            <li className={isActive('/users')}><Link to="/users">Membros</Link></li>
          </ul>
        </div>
        <div className="uk-navbar-right uk-margin-right">
          <ul className="uk-navbar-nav">
            <li>
              <a href="#">
                <span className="uk-margin-small-right" uk-icon="user"></span>
                <span className="uk-visible@s">{user?.name}</span>
              </a>
              <div className="uk-navbar-dropdown">
                <ul className="uk-nav uk-navbar-dropdown-nav">
                  <li className="uk-nav-header">Minha Conta</li>
                  <li><Link to="/profile">Meu Perfil</Link></li>
                  <li className="uk-nav-divider"></li>
                  <li><a onClick={(e) => { e.preventDefault(); logout(); }} href="#">Sair</a></li>
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
    <div>
      {isAuthenticated && <Navbar />}
      
      <main className={isAuthenticated ? "uk-section uk-section-xsmall uk-margin-top" : ""}>
        <div className="uk-container uk-container-small">
          <Routes>
            <Route path="/login" element={<Login />} />
            <Route path="/register" element={<Register />} />
            
            <Route path="/" element={<PrivateRoute><Feed /></PrivateRoute>} />
            <Route path="/devotionals" element={<PrivateRoute><Devotionals /></PrivateRoute>} />
            <Route path="/users" element={<PrivateRoute><Users /></PrivateRoute>} />
            
            <Route path="*" element={<Navigate to="/" />} />
          </Routes>
        </div>
      </main>
    </div>
  );
}
