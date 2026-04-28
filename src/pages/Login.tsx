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
    <div className="uk-section uk-flex uk-flex-center uk-flex-middle">
      <div className="uk-width-large uk-margin-large-top">
        <div className="uk-card uk-card-default uk-card-body uk-box-shadow-large">
          <h2 className="uk-card-title uk-text-center uk-text-bold">Entrar</h2>
          <p className="uk-text-muted uk-text-center uk-margin-remove-top">Bem-vindo ao Portal Ichurch</p>
          
          <form className="uk-form-stacked uk-margin-medium-top" onSubmit={handleLogin}>
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

            <div className="uk-margin">
              <button 
                className="uk-button uk-button-primary uk-width-1-1" 
                type="submit"
                disabled={loading}
              >
                {loading ? <span uk-spinner="ratio: 0.6"></span> : 'Entrar'}
              </button>
            </div>

            <div className="uk-text-center uk-margin-top">
              <p>Não tem uma conta? <Link to="/register" className="uk-link-text uk-text-primary">Registre-se</Link></p>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
};

export default Login;
