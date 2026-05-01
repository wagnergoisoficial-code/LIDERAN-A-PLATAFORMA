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
        UIkit.notification({ message: 'Conta criada com sucesso! Agora crie sua comunidade.', status: 'success', pos: 'top-right' });
        navigate('/dashboard');
      }
    } catch (err: any) {
      UIkit.notification({ message: err.message || 'Erro ao criar conta', status: 'danger', pos: 'top-right' });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="uk-section uk-flex uk-flex-center uk-flex-middle">
      <div className="uk-width-large uk-margin-top">
        <div className="uk-card uk-card-default uk-card-body uk-box-shadow-large">
          <h2 className="uk-card-title uk-text-center uk-text-bold">Registrar</h2>
          <p className="uk-text-muted uk-text-center uk-margin-remove-top">Crie sua conta no Youth Church Portal</p>
          
          <form className="uk-form-stacked uk-margin-medium-top" onSubmit={handleRegister}>
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

            <div className="uk-margin">
              <label className="uk-form-label">Senha</label>
              <div className="uk-inline uk-width-1-1">
                <span className="uk-form-icon" uk-icon="icon: lock"></span>
                <input 
                  className="uk-input" 
                  type="password" 
                  placeholder="Mínimo 6 caracteres"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required 
                  minLength={6}
                />
              </div>
            </div>

            <div className="uk-margin">
              <label className="uk-form-label">Confirmar Senha</label>
              <div className="uk-inline uk-width-1-1">
                <span className="uk-form-icon" uk-icon="icon: lock"></span>
                <input 
                  className="uk-input" 
                  type="password" 
                  placeholder="Confirme sua senha"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  required 
                  minLength={6}
                />
              </div>
            </div>

            <div className="uk-margin">
              <button 
                className="uk-button uk-button-primary uk-width-1-1" 
                type="submit"
                disabled={loading}
              >
                {loading ? <span uk-spinner="ratio: 0.6"></span> : 'Criar Conta'}
              </button>
            </div>

            <div className="uk-text-center uk-margin-top">
              <p>Já tem uma conta? <Link to="/login" className="uk-link-text uk-text-primary">Entrar</Link></p>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
};

export default Register;
