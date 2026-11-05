import React, { useEffect, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import UIkit from 'uikit';
import { api, TOKEN_KEY, USER_KEY } from '../services/api';
import { useAuth } from '../context/AuthContext';
import AuthLayout, { PasswordInput } from '../components/AuthLayout';
import { isMinorDate, todayInput } from '../components/GuardianFields';

// Mesma regra do backend
const PASSWORD_RULE = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d).{8,}$/;

// Registo pelo link de convite de uma comunidade: a pessoa entra logo nela
const InviteRegister: React.FC = () => {
  const { code = '' } = useParams();
  const navigate = useNavigate();
  const { login, isAuthenticated, user } = useAuth();
  const [church, setChurch] = useState<{ name: string } | null>(null);
  const [invalid, setInvalid] = useState(false);
  const [form, setForm] = useState({ name: '', email: '', birthDate: '', password: '', confirmPassword: '' });
  const [showPasswords, setShowPasswords] = useState(false);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    api.getInvite(code).then(res => setChurch(res.data.church)).catch(() => setInvalid(true));
  }, [code]);

  const set = (key: keyof typeof form) => (value: string) => setForm(f => ({ ...f, [key]: value }));
  const minor = isMinorDate(form.birthDate);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!PASSWORD_RULE.test(form.password)) {
      UIkit.notification({ message: 'A senha deve ter pelo menos 8 caracteres, com letra maiúscula, minúscula e número', status: 'danger', pos: 'top-right' });
      return;
    }
    if (form.password !== form.confirmPassword) {
      UIkit.notification({ message: 'As senhas não conferem', status: 'danger', pos: 'top-right' });
      return;
    }
    setLoading(true);
    try {
      const res = await api.registerByInvite(code, form);
      login(res.data.user, res.data.token);
      UIkit.notification({ message: `Bem-vindo à ${church?.name || 'comunidade'}!`, status: 'success', pos: 'top-right' });
      navigate('/');
    } catch (err: any) {
      UIkit.notification({ message: err.message || 'Não foi possível criar a conta', status: 'danger', pos: 'top-right' });
    } finally {
      setLoading(false);
    }
  };

  // Já há uma sessão neste navegador: para criar outra conta é preciso sair primeiro
  const signOutHere = () => {
    localStorage.removeItem(TOKEN_KEY);
    localStorage.removeItem(USER_KEY);
    window.location.reload();
  };

  if (invalid) {
    return (
      <AuthLayout title="Convite inválido" subtitle="Este link já não funciona. Peça um link novo ao seu líder." footer={<Link to="/login">Ir para o início</Link>}>
        <span />
      </AuthLayout>
    );
  }

  if (isAuthenticated) {
    return (
      <AuthLayout title="Já tem sessão iniciada" subtitle={`Está a usar a conta de ${user?.name}. Para criar uma conta nova com este convite, saia primeiro.`}
        footer={<Link to="/">Continuar com a minha conta</Link>}>
        <button className="uk-button uk-button-default auth-submit" type="button" onClick={signOutHere}>Sair e usar o convite</button>
      </AuthLayout>
    );
  }

  return (
    <AuthLayout
      title="Entrar na comunidade"
      subtitle={church ? `Foi convidado para ${church.name}. Crie a sua conta para entrar.` : 'A carregar o convite...'}
      footer={<>Já tem uma conta? <Link to="/login">Entrar</Link></>}
    >
      <form onSubmit={submit}>
        <div className="auth-field">
          <label className="auth-label" htmlFor="invite-name">Nome completo</label>
          <input id="invite-name" className="uk-input" type="text" autoComplete="name" placeholder="Seu nome"
            value={form.name} onChange={e => set('name')(e.target.value)} required />
        </div>
        <div className="auth-field">
          <label className="auth-label" htmlFor="invite-email">E-mail</label>
          <input id="invite-email" className="uk-input" type="email" autoComplete="email" placeholder="seu@email.com"
            value={form.email} onChange={e => set('email')(e.target.value)} required />
        </div>
        <div className="auth-field">
          <label className="auth-label" htmlFor="invite-birth">Data de nascimento</label>
          <input id="invite-birth" className="uk-input" type="date" max={todayInput()}
            value={form.birthDate} onChange={e => set('birthDate')(e.target.value)} required />
          {minor && (
            <p className="auth-hint" role="alert">
              Menores de 18 anos são cadastrados pelo líder da comunidade, com a autorização dos pais. Fale com o seu líder.
            </p>
          )}
        </div>
        <div className="auth-field">
          <label className="auth-label" htmlFor="invite-password">Senha</label>
          <PasswordInput id="invite-password" name="password" autoComplete="new-password" value={form.password} onChange={set('password')}
            visible={showPasswords} onToggle={() => setShowPasswords(v => !v)} toggleControls="invite-password invite-confirm" describedBy="invite-password-hint" />
          <p className="auth-hint" id="invite-password-hint">Mínimo de 8 caracteres, com letra maiúscula, minúscula e número.</p>
        </div>
        <div className="auth-field">
          <label className="auth-label" htmlFor="invite-confirm">Confirmar senha</label>
          <PasswordInput id="invite-confirm" name="confirmPassword" autoComplete="new-password" value={form.confirmPassword} onChange={set('confirmPassword')} visible={showPasswords} />
        </div>
        <button className="uk-button uk-button-primary auth-submit" type="submit" disabled={loading || !church || minor}>
          {loading ? <><span uk-spinner="ratio: 0.5"></span> Criando...</> : 'Criar conta e entrar'}
        </button>
      </form>
    </AuthLayout>
  );
};

export default InviteRegister;
