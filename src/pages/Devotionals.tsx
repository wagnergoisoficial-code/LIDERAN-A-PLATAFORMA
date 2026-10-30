import React, { useState, useEffect } from 'react';
import { api } from '../services/api';
import { useAuth } from '../context/AuthContext';
import UIkit from 'uikit';
import Avatar from '../components/Avatar';

interface Devotional {
  id: string;
  title: string;
  content: string;
  verse: string;
  createdAt: string;
  isActive: boolean;
  hoursRemaining: number;
  shouldBeInactive: boolean;
  user?: { id: string; name: string; profileImage?: string };
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
      if (result.success) setDevotionals(result.data);
    } catch {
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
      UIkit.notification({ message: 'Devocional reativado', status: 'success' });
    } catch (err: any) {
      UIkit.notification({ message: err.message || 'Erro ao reativar devocional', status: 'danger' });
    }
  };

  const isLeaderOrAdmin = user?.role === 'leader' || user?.role === 'admin';
  const activeDevotionals = devotionals.filter(d => d.isActive);
  const inactiveDevotionals = devotionals.filter(d => !d.isActive);

  const StatusBadge = ({ dev }: { dev: Devotional }) => {
    if (!dev.isActive) return <span className="uk-label uk-label-danger">Inativa</span>;
    if (dev.hoursRemaining <= 6) return <span className="uk-label uk-label-warning">{dev.hoursRemaining}h restantes</span>;
    return <span className="uk-label uk-label-success">Ativa</span>;
  };

  return (
    <div>
      {/* Page header */}
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: '24px', paddingBottom: '16px', borderBottom: '1px solid var(--border)' }}>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '4px' }}>
            <span uk-icon="icon: book; ratio: 1.1" style={{ color: 'var(--accent)' }}></span>
            <h2 style={{ margin: 0, fontSize: '20px', fontWeight: 700, letterSpacing: '-0.02em' }}>Devocionais Diários</h2>
          </div>
          <p style={{ margin: 0, fontSize: '13px', color: 'var(--text-muted)' }}>
            Reflexões preparadas pelos líderes — disponíveis por 24h
          </p>
        </div>
        {isLeaderOrAdmin && (
          <button
            className="uk-button uk-button-primary"
            onClick={() => setShowModal(true)}
            style={{ height: '36px', whiteSpace: 'nowrap' }}
          >
            <span uk-icon="icon: plus; ratio: 0.85"></span>
            Novo Devocional
          </button>
        )}
      </div>

      {loading ? (
        <div style={{ textAlign: 'center', padding: '60px 0' }}>
          <span uk-spinner="ratio: 2"></span>
        </div>
      ) : activeDevotionals.length === 0 ? (
        <div style={{ border: '1px solid var(--border)', padding: '60px 24px', textAlign: 'center', background: 'var(--bg-surface)' }}>
          <span uk-icon="icon: heart; ratio: 2.5" style={{ color: 'var(--text-faint)', display: 'block', marginBottom: '16px' }}></span>
          <p style={{ fontSize: '15px', color: 'var(--text-muted)', margin: '0 0 6px', fontWeight: 500 }}>
            Nenhum devocional ativo no momento
          </p>
          <p style={{ fontSize: '13px', color: 'var(--text-faint)', margin: 0 }}>
            Volte mais tarde para novas reflexões espirituais
          </p>
        </div>
      ) : (
        <div className="uk-grid uk-grid-medium" uk-grid="masonry: true">
          {activeDevotionals.map((dev) => (
            <div key={dev.id} className="uk-width-1-2@m">
              <div style={{ border: '1px solid var(--border)', background: 'var(--bg)', transition: 'border-color 160ms ease' }}
                onMouseEnter={(e) => (e.currentTarget.style.borderColor = 'var(--border-strong)')}
                onMouseLeave={(e) => (e.currentTarget.style.borderColor = 'var(--border)')}
              >
                {/* Card header */}
                <div style={{ padding: '14px 16px', borderBottom: '1px solid var(--border)', display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: 'var(--bg-surface)' }}>
                  <h3 style={{ margin: 0, fontSize: '14px', fontWeight: 600 }}>{dev.title}</h3>
                  <StatusBadge dev={dev} />
                </div>

                {/* Author */}
                <div style={{ padding: '12px 16px', borderBottom: '1px solid var(--border)', display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <Avatar name={dev.user?.name || 'Desconhecido'} profileImage={dev.user?.profileImage} size="small" />
                  <span style={{ fontSize: '12px', color: 'var(--text-muted)' }}>Por <strong style={{ color: 'var(--text)' }}>{dev.user?.name}</strong></span>
                </div>

                {/* Verse */}
                <div style={{ padding: '14px 16px', borderBottom: '1px solid var(--border)' }}>
                  <blockquote style={{ borderLeft: '2px solid var(--accent)', paddingLeft: '12px', margin: 0 }}>
                    <p style={{ margin: 0, fontSize: '13px', fontStyle: 'italic', color: 'var(--text-muted)', lineHeight: 1.6 }}>
                      {dev.verse}
                    </p>
                  </blockquote>
                </div>

                {/* Content */}
                <div style={{ padding: '14px 16px' }}>
                  <p style={{ margin: 0, fontSize: '13px', color: 'var(--text)', lineHeight: 1.7 }}>{dev.content}</p>
                </div>

                {/* Actions */}
                {isLeaderOrAdmin && (
                  <div style={{ padding: '10px 16px', borderTop: '1px solid var(--border)', background: 'var(--bg-surface)', display: 'flex', justifyContent: 'flex-end' }}>
                    <button
                      className="uk-button uk-button-text uk-text-danger"
                      onClick={() => handleMarkInactive(dev.id)}
                      style={{ fontSize: '12px', display: 'flex', alignItems: 'center', gap: '4px' }}
                    >
                      <span uk-icon="icon: trash; ratio: 0.8"></span>
                      Marcar inativa
                    </button>
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Inactive history */}
      {isLeaderOrAdmin && inactiveDevotionals.length > 0 && (
        <div style={{ marginTop: '32px', border: '1px solid var(--border)', background: 'var(--bg)' }}>
          <div style={{ padding: '12px 16px', background: 'var(--bg-surface)', borderBottom: '1px solid var(--border)' }}>
            <span style={{ fontSize: '11px', fontWeight: 700, letterSpacing: '0.07em', textTransform: 'uppercase', color: 'var(--text-muted)' }}>
              Histórico Inativo
            </span>
          </div>
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <tbody>
              {inactiveDevotionals.map((dev) => (
                <tr key={dev.id} style={{ borderBottom: '1px solid var(--border)' }}>
                  <td style={{ padding: '10px 16px', fontSize: '13px', fontWeight: 600, color: 'var(--text)' }}>{dev.title}</td>
                  <td style={{ padding: '10px 16px', fontSize: '12px', color: 'var(--text-muted)' }}>{dev.user?.name}</td>
                  <td style={{ padding: '10px 16px', textAlign: 'right' }}>
                    <button
                      className="uk-button uk-button-text uk-text-primary"
                      onClick={() => handleReactivate(dev.id)}
                      style={{ fontSize: '12px', display: 'inline-flex', alignItems: 'center', gap: '4px' }}
                    >
                      <span uk-icon="icon: reply; ratio: 0.8"></span>
                      Reativar
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
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

const CreateDevotionalModal = ({ onCreated, onClose }: { onCreated: () => void; onClose: () => void }) => {
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
        UIkit.notification({ message: result.message || 'Erro ao criar devocional', status: 'danger' });
      }
    } catch (err: any) {
      UIkit.notification({ message: err?.data?.message || err?.message || 'Erro ao criar devocional', status: 'danger' });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="modal-overlay" onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}>
      <div className="modal-box" style={{ maxWidth: '560px' }}>
        <div className="modal-header">
          <h3>Novo Devocional</h3>
          <button className="modal-close-btn" onClick={onClose}>
            <span uk-icon="icon: close; ratio: 0.9"></span>
          </button>
        </div>

        <form className="uk-form-stacked" onSubmit={handleSubmit}>
          <div className="uk-margin">
            <label className="uk-form-label">Título</label>
            <input className="uk-input" type="text" placeholder="Ex: Fé em Ação" value={title} onChange={(e) => setTitle(e.target.value)} required minLength={3} />
          </div>
          <div className="uk-margin">
            <label className="uk-form-label">Versículo Chave</label>
            <input className="uk-input" type="text" placeholder="Ex: João 3:16" value={verse} onChange={(e) => setVerse(e.target.value)} required />
          </div>
          <div className="uk-margin">
            <label className="uk-form-label">Mensagem</label>
            <textarea className="uk-textarea" rows={6} placeholder="Escreva a reflexão de hoje..." value={content} onChange={(e) => setContent(e.target.value)} required minLength={10}></textarea>
          </div>
          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px', marginTop: '20px' }}>
            <button type="button" className="uk-button uk-button-default" onClick={onClose} disabled={loading}>
              Cancelar
            </button>
            <button type="submit" className="uk-button uk-button-primary" disabled={loading}>
              {loading ? <><span uk-spinner="ratio: 0.5"></span> Salvando...</> : <><span uk-icon="icon: check; ratio: 0.85"></span> Salvar</>}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default Devotionals;
