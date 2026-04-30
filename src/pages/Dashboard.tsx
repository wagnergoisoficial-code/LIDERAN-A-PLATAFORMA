import React, { useState, useEffect } from 'react';
import { api } from '../services/api';
import { useAuth } from '../context/AuthContext';
import UIkit from 'uikit';

interface User {
  id: string;
  name: string;
  email: string;
  role: string;
}

interface DevotionalFormData {
  title: string;
  verse: string;
  content: string;
}

const Dashboard = () => {
  const { user } = useAuth();
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'jovens' | 'devocionais'>('jovens');

  // Form states for new member
  const [memberForm, setMemberForm] = useState({
    name: '',
    email: '',
    password: '',
    confirmPassword: '',
  });
  const [submittingMember, setSubmittingMember] = useState(false);

  // Form states for devotional
  const [devotionalForm, setDevotionalForm] = useState<DevotionalFormData>({
    title: '',
    verse: '',
    content: '',
  });
  const [submittingDevotional, setSubmittingDevotional] = useState(false);

  useEffect(() => {
    loadUsers();
  }, []);

  const loadUsers = async () => {
    try {
      const result = await api.getUsers();
      if (result.success) {
        setUsers(result.data);
      }
    } catch (err) {
      UIkit.notification({ message: 'Erro ao carregar membros', status: 'danger' });
    } finally {
      setLoading(false);
    }
  };

  const handleMemberSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmittingMember(true);

    try {
      if (memberForm.password !== memberForm.confirmPassword) {
        throw new Error('As senhas não coincidem');
      }

      const result = await api.createUser({
        name: memberForm.name,
        email: memberForm.email,
        password: memberForm.password,
        role: 'member',
      });

      if (result.success) {
        setMemberForm({ name: '', email: '', password: '', confirmPassword: '' });
        loadUsers();
        UIkit.notification({ message: 'Jovem cadastrado com sucesso!', status: 'success', pos: 'top-right' });
      }
    } catch (err: any) {
      UIkit.notification({ message: err.message || 'Erro ao cadastrar jovem', status: 'danger', pos: 'top-right' });
    } finally {
      setSubmittingMember(false);
    }
  };

  const handleDevotionalSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmittingDevotional(true);

    try {
      const result = await api.createDevotional(devotionalForm);

      if (result.success) {
        setDevotionalForm({ title: '', verse: '', content: '' });
        UIkit.notification({ message: 'Devocional criado com sucesso!', status: 'success', pos: 'top-right' });
      }
    } catch (err: any) {
      UIkit.notification({ message: err.message || 'Erro ao criar devocional', status: 'danger', pos: 'top-right' });
    } finally {
      setSubmittingDevotional(false);
    }
  };

  return (
    <div className="uk-section">
      <div className="uk-container">
        <div className="uk-margin-bottom">
          <h1 className="uk-text-bold">Painel de Controle</h1>
          <p className="uk-text-muted">Bem-vindo, {user?.name}! Gerencie jovens e devocionais aqui.</p>
        </div>

        {/* Tabs */}
        <div className="uk-margin-large-bottom">
          <ul className="uk-tab" uk-tab="true">
            <li className={activeTab === 'jovens' ? 'uk-active' : ''}>
              <a 
                href="#" 
                onClick={(e) => { e.preventDefault(); setActiveTab('jovens'); }}
              >
                <span uk-icon="users" className="uk-margin-small-right"></span>
                Cadastrar Jovens
              </a>
            </li>
            <li className={activeTab === 'devocionais' ? 'uk-active' : ''}>
              <a 
                href="#" 
                onClick={(e) => { e.preventDefault(); setActiveTab('devocionais'); }}
              >
                <span uk-icon="bookmark" className="uk-margin-small-right"></span>
                Criar Devocional
              </a>
            </li>
          </ul>
        </div>

        {/* Jovens Tab */}
        {activeTab === 'jovens' && (
          <div className="uk-grid uk-grid-medium" uk-grid="true">
            {/* Form */}
            <div className="uk-width-1-3@m">
              <div className="uk-card uk-card-default uk-card-body uk-border-rounded">
                <h3 className="uk-card-title uk-text-bold">Novo Jovem</h3>
                <form className="uk-form-stacked" onSubmit={handleMemberSubmit}>
                  <div className="uk-margin">
                    <label className="uk-form-label">Nome</label>
                    <input
                      className="uk-input uk-border-rounded"
                      type="text"
                      placeholder="Nome completo"
                      value={memberForm.name}
                      onChange={(e) => setMemberForm({ ...memberForm, name: e.target.value })}
                      required
                    />
                  </div>
                  <div className="uk-margin">
                    <label className="uk-form-label">E-mail</label>
                    <input
                      className="uk-input uk-border-rounded"
                      type="email"
                      placeholder="email@exemplo.com"
                      value={memberForm.email}
                      onChange={(e) => setMemberForm({ ...memberForm, email: e.target.value })}
                      required
                    />
                  </div>
                  <div className="uk-margin">
                    <label className="uk-form-label">Senha</label>
                    <input
                      className="uk-input uk-border-rounded"
                      type="password"
                      placeholder="Mínimo 8 caracteres"
                      value={memberForm.password}
                      onChange={(e) => setMemberForm({ ...memberForm, password: e.target.value })}
                      required
                    />
                  </div>
                  <div className="uk-margin">
                    <label className="uk-form-label">Confirmar Senha</label>
                    <input
                      className="uk-input uk-border-rounded"
                      type="password"
                      placeholder="Confirme a senha"
                      value={memberForm.confirmPassword}
                      onChange={(e) => setMemberForm({ ...memberForm, confirmPassword: e.target.value })}
                      required
                    />
                  </div>
                  <button
                    className="uk-button uk-button-primary uk-width-1-1 uk-border-rounded"
                    type="submit"
                    disabled={submittingMember}
                  >
                    {submittingMember ? <span uk-spinner="ratio: 0.6"></span> : 'Cadastrar Jovem'}
                  </button>
                </form>
              </div>
            </div>

            {/* List */}
            <div className="uk-width-2-3@m">
              <div className="uk-card uk-card-default uk-border-rounded">
                <div className="uk-card-header">
                  <h3 className="uk-card-title uk-text-bold uk-margin-remove">Jovens Cadastrados</h3>
                </div>
                {loading ? (
                  <div className="uk-card-body uk-text-center">
                    <span uk-spinner="ratio: 2"></span>
                  </div>
                ) : users.length === 0 ? (
                  <div className="uk-card-body uk-text-center">
                    <span uk-icon="icon: info; ratio: 1.5" className="uk-text-muted"></span>
                    <p className="uk-text-muted uk-margin-top">Nenhum jovem cadastrado ainda.</p>
                  </div>
                ) : (
                  <div className="uk-overflow-auto">
                    <table className="uk-table uk-table-hover uk-table-divider uk-table-middle">
                      <thead>
                        <tr>
                          <th>Nome</th>
                          <th>E-mail</th>
                          <th>Cargo</th>
                          <th className="uk-text-right">Ações</th>
                        </tr>
                      </thead>
                      <tbody>
                        {users.map((u) => (
                          <tr key={u.id}>
                            <td className="uk-text-bold">{u.name}</td>
                            <td>{u.email}</td>
                            <td>
                              <span className={`uk-label uk-border-rounded ${u.role === 'leader' ? 'uk-label-warning' : 'uk-label-info'}`}>
                                {u.role === 'leader' ? 'Líder' : 'Membro'}
                              </span>
                            </td>
                            <td className="uk-text-right">
                              <button className="uk-button uk-button-text uk-text-primary" uk-tooltip="Ver perfil">
                                <span uk-icon="search"></span>
                              </button>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            </div>
          </div>
        )}

        {/* Devocionais Tab */}
        {activeTab === 'devocionais' && (
          <div className="uk-grid uk-grid-medium" uk-grid="true">
            <div className="uk-width-1-3@m">
              <div className="uk-card uk-card-default uk-card-body uk-border-rounded">
                <h3 className="uk-card-title uk-text-bold">Novo Devocional</h3>
                <form className="uk-form-stacked" onSubmit={handleDevotionalSubmit}>
                  <div className="uk-margin">
                    <label className="uk-form-label">Título</label>
                    <input
                      className="uk-input uk-border-rounded"
                      type="text"
                      placeholder="Ex: Fé em Ação"
                      value={devotionalForm.title}
                      onChange={(e) => setDevotionalForm({ ...devotionalForm, title: e.target.value })}
                      required
                    />
                  </div>
                  <div className="uk-margin">
                    <label className="uk-form-label">Versículo Chave</label>
                    <input
                      className="uk-input uk-border-rounded"
                      type="text"
                      placeholder="Ex: João 3:16"
                      value={devotionalForm.verse}
                      onChange={(e) => setDevotionalForm({ ...devotionalForm, verse: e.target.value })}
                      required
                    />
                  </div>
                  <div className="uk-margin">
                    <label className="uk-form-label">Conteúdo</label>
                    <textarea
                      className="uk-textarea uk-border-rounded"
                      placeholder="Escreva o devocional aqui..."
                      rows={6}
                      value={devotionalForm.content}
                      onChange={(e) => setDevotionalForm({ ...devotionalForm, content: e.target.value })}
                      required
                    ></textarea>
                  </div>
                  <button
                    className="uk-button uk-button-primary uk-width-1-1 uk-border-rounded"
                    type="submit"
                    disabled={submittingDevotional}
                  >
                    {submittingDevotional ? <span uk-spinner="ratio: 0.6"></span> : 'Publicar Devocional'}
                  </button>
                </form>
              </div>
            </div>
            <div className="uk-width-2-3@m">
              <div className="uk-card uk-card-default uk-card-body uk-border-rounded">
                <h3 className="uk-card-title uk-text-bold">Dica: Seus devocionais publicados</h3>
                <p className="uk-text-muted">
                  Os devocionais que você criar aparecerão aqui e ficarão visíveis para todos os membros da comunidade.
                </p>
                <div className="uk-alert uk-alert-primary uk-border-rounded">
                  <span uk-icon="info"></span>
                  Os devocionais devem ter um título significativo, um versículo para reflexão e um conteúdo de qualidade.
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default Dashboard;
