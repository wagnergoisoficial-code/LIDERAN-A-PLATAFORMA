import React, { useRef, useState } from 'react';
import { Navigate, useNavigate } from 'react-router-dom';
import { api } from '../../services/api';
import { useAuth } from '../../context/AuthContext';
import { PasswordInput } from '../../components/AuthLayout';
import Icon from '../../components/Icon';
import { shake } from '../../lib/motion';

// Entrada da administração: só aceita a conta de administrador (as outras nem chegam a ficar com sessão)
const AdminLogin = () => {
  const { user, login } = useAuth();
  const navigate = useNavigate();
  const formRef = useRef<HTMLFormElement>(null);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [notice, setNotice] = useState('');
  const [loading, setLoading] = useState(false);

  if (user?.role === 'admin') return <Navigate to="/admin" replace />;

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setNotice('');
    try {
      const res = await api.login({ email, password });
      if (res.data.user.role !== 'admin') {
        setNotice('Esta área é só para o administrador da Fourux. Para entrar na sua conta, use a página de entrada normal.');
        shake(formRef.current);
        return;
      }
      login(res.data.user, res.data.token);
      navigate('/admin', { replace: true });
    } catch (err: any) {
      setNotice(err.message || 'Não foi possível entrar');
      shake(formRef.current);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="auth auth-solo">
      <main className="auth-side">
        <span className="auth-brand">fourux <span className="admin-badge">Administração</span></span>
        <div className="auth-form">
          <h1 className="auth-title">Entrar na administração</h1>
          <p className="auth-subtitle">Área reservada ao administrador da plataforma.</p>

          {notice && (
            <div className="error-note auth-notice" role="alert">
              <Icon name="warning" size={18} />
              <span>{notice}</span>
            </div>
          )}

          <form onSubmit={submit} ref={formRef}>
            <div className="auth-field">
              <label className="auth-label" htmlFor="admin-email">E-mail</label>
              <input id="admin-email" name="email" className="uk-input" type="email" autoComplete="username"
                placeholder="Digite o e-mail do administrador" value={email} onChange={(e) => setEmail(e.target.value)} required />
            </div>
            <div className="auth-field">
              <label className="auth-label" htmlFor="admin-password">Senha</label>
              <PasswordInput id="admin-password" name="password" autoComplete="current-password" value={password} onChange={setPassword}
                visible={showPassword} placeholder="Digite a senha" onToggle={() => setShowPassword((v) => !v)} />
            </div>
            <button className="uk-button uk-button-primary auth-submit" type="submit" disabled={loading}>
              {loading ? <><span uk-spinner="ratio: 0.5"></span> Entrando…</> : 'Entrar'}
            </button>
          </form>
        </div>
        <p className="auth-legal">© {new Date().getFullYear()} Fourux. Todos os direitos reservados.</p>
      </main>
    </div>
  );
};

export default AdminLogin;
