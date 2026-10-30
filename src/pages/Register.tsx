import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { api } from '../services/api';
import { useAuth } from '../context/AuthContext';
import UIkit from 'uikit';

const Register = () => {
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();
  const { login } = useAuth();

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    if (password !== confirmPassword) {
      UIkit.notification({ message: 'As senhas não conferem', status: 'danger', pos: 'top-right' });
      return;
    }
    setLoading(true);
    try {
      const response = await api.register({ name, email, password, confirmPassword, role: 'leader' });
      if (response.success) {
        login(response.data.user, response.data.token);
        UIkit.notification({ message: 'Conta criada com sucesso!', status: 'success', pos: 'top-right' });
        navigate('/dashboard');
      }
    } catch (err: any) {
      UIkit.notification({ message: err.message || 'Erro ao criar conta', status: 'danger', pos: 'top-right' });
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
      <div style={{ width: '100%', maxWidth: '420px' }}>

        {/* Brand */}
        <div style={{ marginBottom: '40px', textAlign: 'center' }}>
          <div style={{ display: 'inline-flex', alignItems: 'center', gap: '10px', marginBottom: '8px' }}>
            <div style={{
              width: '32px', height: '32px',
              background: 'var(--nav-bg)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              border: '1px solid var(--nav-border)',
              borderRadius: 'var(--radius-sm)'
            }}>
              <span uk-icon="icon: heart; ratio: 0.9" style={{ color: '#fff' }}></span>
            </div>
            <span style={{ fontSize: '18px', fontWeight: 700, letterSpacing: '-0.04em', color: 'var(--text)' }}>
              ICHURCH
            </span>
          </div>
          <p style={{ margin: 0, fontSize: '13px', color: 'var(--text-muted)' }}>
            Crie sua conta de líder
          </p>
        </div>

        {/* Card */}
        <div className="card" style={{ borderColor: 'var(--border-strong)', borderRadius: 'var(--radius-lg)' }}>

          <div style={{ padding: '28px' }}>
            <form className="uk-form-stacked" onSubmit={handleRegister}>

              <div className="uk-margin">
                <label className="uk-form-label">Nome Completo</label>
                <div className="uk-inline uk-width-1-1">
                  <span className="uk-form-icon" uk-icon="icon: user"></span>
                  <input
                    className="uk-input"
                    type="text"
                    placeholder="Seu nome"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    required
                  />
                </div>
              </div>

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

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', alignItems: 'start' }}>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                  <label className="uk-form-label" style={{ marginBottom: 0 }}>Senha</label>
                  <input
                    className="uk-input"
                    type="password"
                    placeholder="Mínimo 6 char."
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    required
                    minLength={6}
                  />
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                  <label className="uk-form-label" style={{ marginBottom: 0 }}>Confirmar</label>
                  <input
                    className="uk-input"
                    type="password"
                    placeholder="Repita a senha"
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    required
                    minLength={6}
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
                    ? <><span uk-spinner="ratio: 0.5"></span> Criando...</>
                    : <><span uk-icon="icon: check; ratio: 0.85"></span> Criar Conta</>
                  }
                </button>
              </div>

            </form>
          </div>

          <div style={{
            padding: '16px 28px',
            borderTop: '1px solid var(--border)',
            background: 'var(--bg-surface)',
            textAlign: 'center'
          }}>
            <span style={{ fontSize: '13px', color: 'var(--text-muted)' }}>
              Já tem uma conta?{' '}
              <Link to="/login" style={{ color: 'var(--accent)', fontWeight: 600 }}>
                Entrar
              </Link>
            </span>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Register;
