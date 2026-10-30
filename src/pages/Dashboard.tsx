import { useState, useEffect } from 'react';
import { api } from '../services/api';
import { useAuth } from '../context/AuthContext';
import UIkit from 'uikit';
import ChurchCreate from '../components/ChurchCreate';
import ChurchMembers from '../components/ChurchMembers';
import PageHeader from '../components/PageHeader';
import EmptyState from '../components/EmptyState';

interface Church {
  id: string;
  name: string;
  title?: string;
  description?: string;
  cultosDias?: string[];
  users?: any[];
  memberCount?: number;
  isActive?: boolean;
  isOwner?: boolean;
}

const Dashboard = () => {
  const { user, applySession } = useAuth();
  const [churches, setChurches] = useState<Church[]>([]);
  const [selectedChurch, setSelectedChurch] = useState<Church | null>(null);
  const [loading, setLoading] = useState(true);
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [editing, setEditing] = useState(false);
  const [busy, setBusy] = useState(false);
  const [showMembersModal, setShowMembersModal] = useState(false);

  useEffect(() => { loadChurches(); }, [user?.churchId]);

  // Mantém a comunidade selecionada; sem seleção, abre a ativa
  const loadChurches = async (selectId?: string) => {
    try {
      const result = await api.getMyChurches();
      if (result.success) {
        const list: Church[] = result.data || [];
        setChurches(list);
        setSelectedChurch(prev =>
          list.find(c => c.id === (selectId || prev?.id)) || list.find(c => c.isActive) || list[0] || null
        );
      }
    } catch (err: any) {
      UIkit.notification({ message: err.message || 'Erro ao carregar comunidades', status: 'danger', pos: 'top-right' });
    } finally {
      setLoading(false);
    }
  };

  // Após criar, abre a nova comunidade; após editar, mantém a seleção
  const handleChurchCreated = (church?: { id: string }) => {
    loadChurches(church?.id || selectedChurch?.id);
    setShowCreateForm(false);
    setEditing(false);
  };

  const handleActivate = async (church: Church) => {
    setBusy(true);
    try {
      const res = await api.activateChurch(church.id);
      applySession(res.session);
      UIkit.notification({ message: res.message || 'Comunidade ativada', status: 'success', pos: 'top-right' });
    } catch (err: any) {
      UIkit.notification({ message: err.message || 'Erro ao ativar comunidade', status: 'danger', pos: 'top-right' });
    } finally {
      setBusy(false);
    }
  };

  const handleDelete = async (church: Church) => {
    if (!confirm(`Excluir a comunidade "${church.name}"? Publicações, eventos e mensagens dela também serão apagados.`)) return;
    setBusy(true);
    try {
      const res = await api.deleteChurch(church.id);
      applySession(res.session);
      setSelectedChurch(null);
      await loadChurches();
      UIkit.notification({ message: 'Comunidade excluída', status: 'success', pos: 'top-right' });
    } catch (err: any) {
      UIkit.notification({ message: err.message || 'Erro ao excluir comunidade', status: 'danger', pos: 'top-right' });
    } finally {
      setBusy(false);
    }
  };

  return (
    <div>
      <PageHeader
        icon="grid"
        title="Painel do Líder"
        subtitle="Gerencie suas comunidades"
        actions={(
          <button
            className={`uk-button ${showCreateForm ? 'uk-button-default' : 'uk-button-primary'}`}
            onClick={() => { setShowCreateForm(!showCreateForm); setEditing(false); }}
          >
            <span uk-icon={`icon: ${showCreateForm ? 'close' : 'plus'}; ratio: 0.8`}></span>
            {showCreateForm ? 'Cancelar' : 'Nova Comunidade'}
          </button>
        )}
      />

      <div className="dash-layout">

        {/* ── LISTA DE COMUNIDADES ──────────────────────────────── */}
        <aside className="card">
          <div className="card-header">
            <span className="card-title">Comunidades</span>
            {!loading && <span style={{ fontSize: '11px', fontWeight: 600, color: 'var(--text-faint)' }}>{churches.length}</span>}
          </div>

          {loading ? (
            <div style={{ padding: '20px', textAlign: 'center' }}>
              <span uk-spinner="ratio: 0.7"></span>
            </div>
          ) : churches.length === 0 ? (
            <div style={{ padding: '20px 16px', fontSize: '12px', color: 'var(--text-faint)', textAlign: 'center' }}>
              Nenhuma comunidade criada
            </div>
          ) : (
            churches.map((church) => {
              const active = selectedChurch?.id === church.id;
              return (
                <button
                  key={church.id}
                  onClick={() => { setSelectedChurch(church); setShowCreateForm(false); setEditing(false); }}
                  style={{
                    width: '100%',
                    padding: '10px 16px',
                    background: active ? 'var(--bg-elevated)' : 'transparent',
                    color: active ? 'var(--text)' : 'var(--text-muted)',
                    border: 'none',
                    borderLeft: `2px solid ${active ? 'var(--accent)' : 'transparent'}`,
                    cursor: 'pointer',
                    textAlign: 'left',
                    fontSize: '13px',
                    fontFamily: 'inherit',
                    fontWeight: active ? 600 : 400,
                    transition: 'background var(--t), color var(--t)'
                  }}
                  onMouseEnter={(e) => {
                    if (!active) {
                      e.currentTarget.style.background = 'var(--bg-elevated)';
                      e.currentTarget.style.color = 'var(--text)';
                    }
                  }}
                  onMouseLeave={(e) => {
                    if (!active) {
                      e.currentTarget.style.background = 'transparent';
                      e.currentTarget.style.color = 'var(--text-muted)';
                    }
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '8px', marginBottom: '2px' }}>
                    <span style={{ fontWeight: 600, fontSize: '13px', minWidth: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{church.name}</span>
                    {church.isActive && <span className="uk-label">Ativa</span>}
                  </div>
                  <div style={{ fontSize: '11px', display: 'flex', alignItems: 'center', gap: '4px', opacity: 0.7 }}>
                    <span uk-icon="icon: users; ratio: 0.65"></span>
                    {church.memberCount ?? church.users?.length ?? 0} membro{(church.memberCount ?? church.users?.length) !== 1 ? 's' : ''}
                  </div>
                </button>
              );
            })
          )}
        </aside>

        {/* ── CONTEÚDO ─────────────────────────────────────────── */}
        <div style={{ minWidth: 0 }}>

          {showCreateForm || (editing && selectedChurch) ? (
            <div style={{ maxWidth: '600px' }}>
              <ChurchCreate
                key={editing ? selectedChurch?.id : 'new'}
                church={editing && selectedChurch ? selectedChurch : undefined}
                onChurchCreated={handleChurchCreated}
              />
              {editing && (
                <button className="uk-button uk-button-default" style={{ marginTop: '12px' }} onClick={() => setEditing(false)}>
                  Cancelar
                </button>
              )}
            </div>

          ) : selectedChurch ? (
            <div>
              {/* Dados da comunidade */}
              <div className="card" style={{ padding: '24px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '16px' }}>
                  <div style={{ minWidth: 0 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                      <h2 style={{ margin: 0, fontSize: '18px', fontWeight: 700, color: 'var(--text)' }}>{selectedChurch.name}</h2>
                      {selectedChurch.isActive && <span className="uk-label">Ativa</span>}
                    </div>
                    {selectedChurch.title && (
                      <p style={{ margin: '4px 0 0', fontSize: '13px', color: 'var(--text-muted)' }}>{selectedChurch.title}</p>
                    )}
                  </div>
                  <div style={{ display: 'flex', gap: '8px', flexShrink: 0 }}>
                    {!selectedChurch.isActive && (
                      <button className="uk-button uk-button-primary uk-button-small" disabled={busy} onClick={() => handleActivate(selectedChurch)}>
                        <span uk-icon="icon: check; ratio: 0.8"></span>
                        Tornar ativa
                      </button>
                    )}
                    <button className="uk-button uk-button-default uk-button-small" onClick={() => setShowMembersModal(true)}>
                      <span uk-icon="icon: users; ratio: 0.8"></span>
                      Ver Membros
                    </button>
                  </div>
                </div>

                {!selectedChurch.isActive && (
                  <p style={{ margin: '12px 0 0', fontSize: '12px', color: 'var(--text-muted)' }}>
                    Feed, chat, eventos e demais páginas mostram a comunidade ativa. Torne esta comunidade ativa para publicar nela.
                  </p>
                )}

                <div style={{ marginTop: '20px', paddingTop: '16px', borderTop: '1px solid var(--border)', display: 'flex', flexDirection: 'column', gap: '20px' }}>
                  <div>
                    <div className="list-label" style={{ marginBottom: '6px' }}>Descrição</div>
                    <p style={{ margin: 0, fontSize: '13px', color: selectedChurch.description ? 'var(--text)' : 'var(--text-faint)', lineHeight: 1.6 }}>
                      {selectedChurch.description || 'Sem descrição cadastrada.'}
                    </p>
                  </div>

                  {selectedChurch.cultosDias && selectedChurch.cultosDias.length > 0 && (
                    <div>
                      <div className="list-label" style={{ marginBottom: '8px' }}>Dias de Culto</div>
                      <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px' }}>
                        {selectedChurch.cultosDias.map((dia) => (
                          <span key={dia} className="tag" style={{ textTransform: 'capitalize' }}>
                            {dia}
                          </span>
                        ))}
                      </div>
                    </div>
                  )}
                </div>

                <div style={{ marginTop: '20px', paddingTop: '16px', borderTop: '1px solid var(--border)', display: 'flex', justifyContent: 'flex-end', gap: '8px' }}>
                  <button className="uk-button uk-button-default uk-button-small" onClick={() => { setEditing(true); setShowCreateForm(false); }}>
                    <span uk-icon="icon: pencil; ratio: 0.8"></span>
                    Editar
                  </button>
                  {(selectedChurch.isOwner || user?.role === 'admin') && (
                    <button className="uk-button uk-button-danger uk-button-small" disabled={busy} onClick={() => handleDelete(selectedChurch)}>
                      <span uk-icon="icon: trash; ratio: 0.8"></span>
                      Excluir
                    </button>
                  )}
                </div>
              </div>

              {/* Membros */}
              <div style={{ marginTop: '24px' }}>
                <ChurchMembers churchId={selectedChurch.id} churchName={selectedChurch.name} />
              </div>
            </div>

          ) : (
            <EmptyState icon="list" title="Selecione uma comunidade ou crie uma nova" />
          )}
        </div>
      </div>

      {/* ── MODAL DE MEMBROS ─────────────────────────────────────── */}
      {showMembersModal && selectedChurch && (
        <div className="modal-overlay" onClick={(e) => { if (e.target === e.currentTarget) setShowMembersModal(false); }}>
          <div className="modal-box" style={{ maxWidth: '1000px' }}>
            <div className="modal-header">
              <h3>Membros — {selectedChurch.name}</h3>
              <button className="modal-close-btn" onClick={() => setShowMembersModal(false)}>
                <span uk-icon="icon: close; ratio: 0.9"></span>
              </button>
            </div>
            <ChurchMembers churchId={selectedChurch.id} churchName={selectedChurch.name} />
          </div>
        </div>
      )}
    </div>
  );
};

export default Dashboard;
