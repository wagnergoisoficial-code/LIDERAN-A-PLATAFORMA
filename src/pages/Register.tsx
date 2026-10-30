import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { api } from '../services/api';
import { useAuth } from '../context/AuthContext';
import UIkit from 'uikit';
import AuthLayout, { PasswordInput } from '../components/AuthLayout';

// Mesma regra do backend
const PASSWORD_RULE = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d).{8,}$/;
const PASSWORD_HINT = 'A senha deve ter pelo menos 8 caracteres, com letra maiúscula, minúscula e número';

const Register = () => {
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPasswords, setShowPasswords] = useState(false);
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();
  const { login } = useAuth();

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!PASSWORD_RULE.test(password)) {
      UIkit.notification({ message: PASSWORD_HINT, status: 'danger', pos: 'top-right' });
      return;
    }
    if (password !== confirmPassword) {
      UIkit.notification({ message: 'As senhas não conferem', status: 'danger', pos: 'top-right' });
      return;
    }
    setLoading(true);
    try {
      const response = await api.register({ name, email, password, confirmPassword });
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
    <AuthLayout
      title="Criar conta"
      subtitle="Crie sua conta de líder e comece sua comunidade."
      footer={<>Já tem uma conta? <Link to="/login">Entrar</Link></>}
    >
      <form onSubmit={handleRegister}>
        <div className="auth-field">
          <label className="auth-label" htmlFor="register-name">Nome completo</label>
          <input
            id="register-name"
            name="name"
            className="uk-input"
            type="text"
            placeholder="Seu nome"
            autoComplete="name"
            value={name}
            onChange={(e) => setName(e.target.value)}
            required
          />
        </div>

        <div className="auth-field">
          <label className="auth-label" htmlFor="register-email">E-mail</label>
          <input
            id="register-email"
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
          <label className="auth-label" htmlFor="register-password">Senha</label>
          <PasswordInput
            id="register-password"
            name="password"
            autoComplete="new-password"
            value={password}
            onChange={setPassword}
            visible={showPasswords}
            onToggle={() => setShowPasswords((visible) => !visible)}
            toggleControls="register-password register-confirm"
            describedBy="register-password-hint"
          />
          <p className="auth-hint" id="register-password-hint">
            Mínimo de 8 caracteres, com letra maiúscula, minúscula e número.
          </p>
        </div>

        <div className="auth-field">
          <label className="auth-label" htmlFor="register-confirm">Confirmar senha</label>
          <PasswordInput
            id="register-confirm"
            name="confirmPassword"
            autoComplete="new-password"
            value={confirmPassword}
            onChange={setConfirmPassword}
            visible={showPasswords}
          />
        </div>

        <button className="uk-button uk-button-primary auth-submit" type="submit" disabled={loading}>
          {loading ? <><span uk-spinner="ratio: 0.5"></span> Criando...</> : 'Criar conta'}
        </button>
      </form>
    </AuthLayout>
  );
};

export default Register;
