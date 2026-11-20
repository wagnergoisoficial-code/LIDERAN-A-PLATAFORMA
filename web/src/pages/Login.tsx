import React, { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { api, RESTRICTED_KEY } from '../services/api';
import { useAuth } from '../context/AuthContext';
import UIkit from 'uikit';
import AuthLayout, { PasswordInput } from '../components/AuthLayout';
import Icon from '../components/Icon';

const Login = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  // Conta suspensa, bloqueada ou à espera dos pais: o motivo fica visível acima do formulário
  const [notice, setNotice] = useState<string | null>(null);
  const navigate = useNavigate();
  const { login } = useAuth();

  useEffect(() => {
    try {
      const reason = sessionStorage.getItem(RESTRICTED_KEY);
      if (reason) {
        setNotice(reason);
        sessionStorage.removeItem(RESTRICTED_KEY);
      }
    } catch { /* sem armazenamento */ }
  }, []);

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
      if (err.data?.code === 'ACCOUNT_RESTRICTED') setNotice(err.message);
      else UIkit.notification({ message: err.message || 'Erro ao fazer login', status: 'danger', pos: 'top-right' });
    } finally {
      setLoading(false);
    }
  };

  return (
    <AuthLayout
      title="Entrar"
      subtitle="Entre na sua conta para continuar."
      footer={<>Não tem uma conta? <Link to="/register">Criar conta</Link></>}
    >
      {notice && (
        <div className="error-note auth-notice" role="alert">
          <Icon name="warning" size={18} />
          <span>{notice}</span>
        </div>
      )}

      <form onSubmit={handleLogin}>
        <div className="auth-field">
          <label className="auth-label" htmlFor="login-email">E-mail</label>
          <input
            id="login-email"
            name="email"
            className="uk-input"
            type="email"
            placeholder="seu@email.com"
            autoComplete="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
          />
        </div>

        <div className="auth-field">
          <label className="auth-label" htmlFor="login-password">Senha</label>
          <PasswordInput
            id="login-password"
            name="password"
            autoComplete="current-password"
            value={password}
            onChange={setPassword}
            visible={showPassword}
            onToggle={() => setShowPassword((visible) => !visible)}
          />
        </div>

        <button className="uk-button uk-button-primary auth-submit" type="submit" disabled={loading}>
          {loading ? <><span uk-spinner="ratio: 0.5"></span> Entrando…</> : 'Entrar'}
        </button>
      </form>
    </AuthLayout>
  );
};

export default Login;
