import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { api } from '../services/api';
import { useAuth } from '../context/AuthContext';
import UIkit from 'uikit';

const Login = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();
  const { login } = useAuth();

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      const response = await api.login({ email, password });
      if (response.success) {
        login(response.data.user, response.data.token);
        UIkit.notification({ message: 'Bem-vindo de volta!', status: 'success', pos: 'top-right' });
        navigate('/');
      }
    } catch (err: any) {
      UIkit.notification({ message: err.message || 'Erro ao fazer login', status: 'danger', pos: 'top-right' });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{
      minHeight: '100vh',
      background: 'var(--bg)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      padding: '24px'
    }}>
      <div style={{ width: '100%', maxWidth: '400px' }}>

        {/* Logo / Brand */}
        <div style={{ marginBottom: '40px', textAlign: 'center' }}>
          <div style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: '10px',
            marginBottom: '8px'
          }}>
            <div style={{
              width: '32px', height: '32px',
              background: 'var(--nav-bg)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              border: '1px solid var(--nav-border)'
            }}>
              <span uk-icon="icon: heart; ratio: 0.9" style={{ color: 'var(--accent)' }}></span>
            </div>
            <span style={{ fontSize: '18px', fontWeight: 700, letterSpacing: '-0.04em', color: 'var(--text)' }}>
              ICHURCH
            </span>
          </div>
          <p style={{ margin: 0, fontSize: '13px', color: 'var(--text-muted)' }}>
            Entre na sua conta para continuar
          </p>
        </div>

        {/* Form Card */}
        <div style={{ border: '1px solid var(--border-strong)', background: 'var(--bg)' }}>
          {/* Top accent bar */}
          <div style={{ height: '2px', background: 'var(--accent)' }}></div>

          <div style={{ padding: '28px' }}>
            <form className="uk-form-stacked" onSubmit={handleLogin}>

              <div className="uk-margin">
                <label className="uk-form-label">E-mail</label>
                <div className="uk-inline uk-width-1-1">
                  <span className="uk-form-icon" uk-icon="icon: mail"></span>
                  <input
                    className="uk-input"
                    type="email"
                    placeholder="seu@email.com"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    required
                  />
                </div>
              </div>

              <div className="uk-margin">
                <label className="uk-form-label">Senha</label>
                <div className="uk-inline uk-width-1-1">
                  <span className="uk-form-icon" uk-icon="icon: lock"></span>
                  <input
                    className="uk-input"
                    type="password"
                    placeholder="Sua senha"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    required
                  />
                </div>
              </div>

              <div className="uk-margin" style={{ marginTop: '24px' }}>
                <button
                  className="uk-button uk-button-primary uk-width-1-1"
                  type="submit"
                  disabled={loading}
                  style={{ height: '40px', fontSize: '14px', fontWeight: 600, justifyContent: 'center' }}
                >
                  {loading
                    ? <><span uk-spinner="ratio: 0.5"></span> Entrando...</>
                    : <><span uk-icon="icon: sign-in; ratio: 0.85"></span> Entrar</>
                  }
                </button>
              </div>

            </form>
          </div>

          {/* Footer */}
          <div style={{
            padding: '16px 28px',
            borderTop: '1px solid var(--border)',
            background: 'var(--bg-surface)',
            textAlign: 'center'
          }}>
            <span style={{ fontSize: '13px', color: 'var(--text-muted)' }}>
              Não tem uma conta?{' '}
              <Link to="/register" style={{ color: 'var(--accent)', fontWeight: 600 }}>
                Registre-se
              </Link>
            </span>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Login;
