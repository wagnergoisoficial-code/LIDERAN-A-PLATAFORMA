import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { api } from '../services/api';
import { useAuth } from '../context/AuthContext';
import UIkit from 'uikit';
import AuthLayout, { PasswordInput } from '../components/AuthLayout';

const Login = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
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
    <AuthLayout
      title="Entrar"
      subtitle="Entre na sua conta para continuar."
      footer={<>Não tem uma conta? <Link to="/register">Criar conta</Link></>}
    >
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
          {loading ? <><span uk-spinner="ratio: 0.5"></span> Entrando...</> : 'Entrar'}
        </button>
      </form>
    </AuthLayout>
  );
};

export default Login;
