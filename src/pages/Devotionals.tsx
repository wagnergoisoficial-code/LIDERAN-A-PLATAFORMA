import React, { useState, useEffect } from 'react';
import { api } from '../services/api';
import { useAuth } from '../context/AuthContext';
import UIkit from 'uikit';

interface Devotional {
  id: string;
  title: string;
  content: string;
  verse: string;
  createdAt: string;
  isActive: boolean;
  hoursRemaining: number;
  shouldBeInactive: boolean;
  user?: { id: string; name: string };
}

const Devotionals = () => {
  const [devotionals, setDevotionals] = useState<Devotional[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const { user } = useAuth();

  useEffect(() => {
    loadDevotionals();
    const interval = setInterval(loadDevotionals, 60000);
    return () => clearInterval(interval);
  }, []);

  const loadDevotionals = async () => {
    try {
      const result = await api.getDevotionals();
      if (result.success) {
        setDevotionals(result.data);
      }
    } catch (err) {
      console.error('Erro ao carregar devocionais:', err);
      setDevotionals([]);
    } finally {
      setLoading(false);
    }
  };

  const handleMarkInactive = async (id: string) => {
    try {
      await api.markDevotionalInactive(id);
      loadDevotionals();
      UIkit.notification({ message: 'Devocional marcado como inativo', status: 'success' });
    } catch (err: any) {
      UIkit.notification({ message: err.message || 'Erro ao atualizar devocional', status: 'danger' });
    }
  };

  const handleReactivate = async (id: string) => {
    try {
      await api.reactivateDevotional(id);
      loadDevotionals();
      UIkit.notification({ message: 'Devocional reativado com sucesso', status: 'success' });
    } catch (err: any) {
      UIkit.notification({ message: err.message || 'Erro ao reativar devocional', status: 'danger' });
    }
  };

  const isLeaderOrAdmin = user?.role === 'leader' || user?.role === 'admin';
  const activeDevotionals = devotionals.filter(d => d.isActive);

  const getStatusBadge = (dev: Devotional) => {
    if (!dev.isActive) {
      return <span className="uk-label uk-label-danger uk-border-rounded">Inativa</span>;
    }
    if (dev.hoursRemaining <= 6) {
      return <span className="uk-label uk-label-warning uk-border-rounded">{dev.hoursRemaining}h restantes</span>;
    }
    return <span className="uk-label uk-label-success uk-border-rounded">Ativa</span>;
  };

  return (
    <div>
      <div className="uk-grid-medium uk-flex-middle uk-margin-bottom" uk-grid="">
        <div className="uk-width-expand">
          <h2 className="uk-text-bold">Devocionais Diários</h2>
          <p className="uk-text-muted">Fortaleça sua fé com reflexões preparadas pelos líderes. (Disponível por 24h)</p>
        </div>
        {isLeaderOrAdmin && (
          <div className="uk-width-auto">
            <button
              className="uk-button uk-button-primary uk-border-rounded"
              onClick={() => setShowModal(true)}
            >
              <span uk-icon="plus" className="uk-margin-small-right"></span>
              Novo Devocional
            </button>
          </div>
        )}
      </div>

      {loading ? (
        <div className="uk-text-center uk-margin-large-top">
          <span uk-spinner="ratio: 2"></span>
        </div>
      ) : activeDevotionals.length === 0 ? (
        <div style={{
          background: 'white',
          padding: '48px 24px',
          borderRadius: '12px',
          boxShadow: '0 1px 3px rgba(0,0,0,0.08)',
          textAlign: 'center'
        }}>
          <div style={{ fontSize: '48px', marginBottom: '16px' }}>🙏</div>
          <p style={{ fontSize: '16px', color: '#6c757d', margin: '0' }}>Nenhum devocional ativo no momento</p>
          <p style={{ fontSize: '14px', color: '#adb5bd', margin: '8px 0 0 0' }}>Volte mais tarde para novas reflexões espirituais</p>
        </div>
      ) : (
        <div className="uk-grid uk-grid-medium" uk-grid="masonry: true">
          {activeDevotionals.map((dev) => (
            <div key={dev.id} className="uk-width-1-2@m">
              <div className="uk-card uk-card-default uk-card-body uk-border-rounded">
                <div className="uk-flex uk-flex-between uk-flex-middle uk-margin-bottom">
                  <h3 className="uk-card-title uk-text-bold uk-margin-remove">{dev.title}</h3>
                  {getStatusBadge(dev)}
                </div>

                <p className="uk-text-meta uk-text-small uk-margin-small">
                  Por {dev.user?.name}
                </p>

                <blockquote className="uk-margin-medium-top" style={{ borderLeft: '3px solid #1e87f0', paddingLeft: '15px' }}>
                  <p className="uk-text-italic uk-text-small">{dev.verse}</p>
                </blockquote>

                <p className="uk-margin-medium-top uk-text-justify">{dev.content}</p>

                {isLeaderOrAdmin && dev.isActive && (
                  <div className="uk-margin-top uk-flex uk-flex-right">
                    <button
                      className="uk-button uk-button-text uk-text-danger uk-button-small"
                      onClick={() => handleMarkInactive(dev.id)}
                    >
                      <span uk-icon="icon: trash; ratio: 0.8" className="uk-margin-small-right"></span>
                      Marcar inativa
                    </button>
                  </div>
                )}

                {isLeaderOrAdmin && !dev.isActive && (
                  <div className="uk-margin-top">
                    <button
                      className="uk-button uk-button-text uk-text-primary uk-button-small"
                      onClick={() => handleReactivate(dev.id)}
                    >
                      <span uk-icon="icon: reply; ratio: 0.8" className="uk-margin-small-right"></span>
                      Reativar
                    </button>
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      {isLeaderOrAdmin && devotionals.filter(d => !d.isActive).length > 0 && (
        <div className="uk-margin-large-top uk-padding uk-card uk-card-default uk-border-rounded">
          <h4 className="uk-text-bold">Histórico de Devocionais Inativos</h4>
          <div className="uk-overflow-auto">
            <table className="uk-table uk-table-small">
              <tbody>
                {devotionals.filter(d => !d.isActive).map((dev) => (
                  <tr key={dev.id}>
                    <td className="uk-text-bold">{dev.title}</td>
                    <td className="uk-text-small uk-text-muted">{dev.user?.name}</td>
                    <td className="uk-text-right">
                      <button
                        className="uk-button uk-button-link uk-button-small"
                        onClick={() => handleReactivate(dev.id)}
                      >
                        Reativar
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {showModal && (
        <CreateDevotionalModal
          onCreated={() => { loadDevotionals(); setShowModal(false); }}
          onClose={() => setShowModal(false)}
        />
      )}
    </div>
  );
};

const CreateDevotionalModal = ({
  onCreated,
  onClose,
}: {
  onCreated: () => void;
  onClose: () => void;
}) => {
  const [title, setTitle] = useState('');
  const [verse, setVerse] = useState('');
  const [content, setContent] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      const result = await api.createDevotional({ title, verse, content });

      if (result.success) {
        UIkit.notification({ message: 'Devocional criado com sucesso!', status: 'success' });
        onCreated();
      } else {
        UIkit.notification({
          message: result.message || 'Erro ao criar devocional',
          status: 'danger',
        });
      }
    } catch (err: any) {
      const msg = err?.data?.message || err?.message || 'Erro ao criar devocional';
      UIkit.notification({ message: msg, status: 'danger' });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div
      style={{
        position: 'fixed',
        top: 0, left: 0, right: 0, bottom: 0,
        backgroundColor: 'rgba(0,0,0,0.5)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        zIndex: 1000,
      }}
      onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
    >
      <div style={{
        backgroundColor: 'white',
        borderRadius: '8px',
        padding: '32px',
        width: '90%',
        maxWidth: '600px',
        maxHeight: '90vh',
        overflowY: 'auto',
        boxShadow: '0 10px 40px rgba(0,0,0,0.2)',
      }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
          <h2 style={{ margin: 0, fontSize: '22px', fontWeight: '700' }}>Novo Devocional</h2>
          <button
            type="button"
            onClick={onClose}
            style={{ background: 'none', border: 'none', fontSize: '20px', cursor: 'pointer', color: '#6c757d' }}
          >
            ✕
          </button>
        </div>

        <form className="uk-form-stacked" onSubmit={handleSubmit}>
          <div className="uk-margin">
            <label className="uk-form-label">Título</label>
            <input
              className="uk-input uk-border-rounded"
              type="text"
              placeholder="Ex: Fé em Ação"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              required
              minLength={3}
            />
          </div>
          <div className="uk-margin">
            <label className="uk-form-label">Versículo Chave</label>
            <input
              className="uk-input uk-border-rounded"
              type="text"
              placeholder="Ex: João 3:16"
              value={verse}
              onChange={(e) => setVerse(e.target.value)}
              required
            />
          </div>
          <div className="uk-margin">
            <label className="uk-form-label">Mensagem</label>
            <textarea
              className="uk-textarea uk-border-rounded"
              rows={6}
              placeholder="Escreva a reflexão de hoje..."
              value={content}
              onChange={(e) => setContent(e.target.value)}
              required
              minLength={10}
            ></textarea>
          </div>
          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '12px', marginTop: '24px' }}>
            <button
              type="button"
              className="uk-button uk-button-default uk-border-rounded"
              onClick={onClose}
              disabled={loading}
            >
              Cancelar
            </button>
            <button
              type="submit"
              className="uk-button uk-button-primary uk-border-rounded"
              disabled={loading}
            >
              {loading ? <span uk-spinner="ratio: 0.6"></span> : 'Salvar'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default Devotionals;
