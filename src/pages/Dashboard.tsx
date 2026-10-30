import { useState, useEffect } from 'react';
import { api } from '../services/api';
import { useAuth } from '../context/AuthContext';
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
}

const Dashboard = () => {
  useAuth();
  const [churches, setChurches] = useState<Church[]>([]);
  const [selectedChurch, setSelectedChurch] = useState<Church | null>(null);
  const [loading, setLoading] = useState(true);
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [showMembersModal, setShowMembersModal] = useState(false);

  useEffect(() => { loadChurches(); }, []);

  const loadChurches = async () => {
    setLoading(true);
    try {
      const result = await api.getMyChurches();
      if (result.success) {
        setChurches(result.data || []);
        if (result.data?.length > 0) setSelectedChurch(result.data[0]);
      }
    } catch (err: any) {
      console.error('Erro ao carregar comunidades:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleChurchCreated = () => {
    loadChurches();
    setShowCreateForm(false);
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
            onClick={() => setShowCreateForm(!showCreateForm)}
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
                  onClick={() => { setSelectedChurch(church); setShowCreateForm(false); }}
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
                    transition: 'all 160ms ease'
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
                  <div style={{ fontWeight: 600, marginBottom: '2px', fontSize: '13px' }}>{church.name}</div>
                  {church.users && (
                    <div style={{ fontSize: '11px', display: 'flex', alignItems: 'center', gap: '4px', opacity: 0.7 }}>
                      <span uk-icon="icon: users; ratio: 0.65"></span>
                      {church.users.length} membro{church.users.length !== 1 ? 's' : ''}
                    </div>
                  )}
                </button>
              );
            })
          )}
        </aside>

        {/* ── CONTEÚDO ─────────────────────────────────────────── */}
        <div style={{ minWidth: 0 }}>

          {showCreateForm ? (
            <div style={{ maxWidth: '600px' }}>
              <ChurchCreate onChurchCreated={handleChurchCreated} />
            </div>

          ) : selectedChurch ? (
            <div>
              {/* Dados da comunidade */}
              <div className="card" style={{ padding: '24px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '16px' }}>
                  <div style={{ minWidth: 0 }}>
                    <h2 style={{ margin: 0, fontSize: '18px', fontWeight: 700, color: 'var(--text)' }}>{selectedChurch.name}</h2>
                    {selectedChurch.title && (
                      <p style={{ margin: '4px 0 0', fontSize: '13px', color: 'var(--text-muted)' }}>{selectedChurch.title}</p>
                    )}
                  </div>
                  <button className="uk-button uk-button-default uk-button-small" onClick={() => setShowMembersModal(true)}>
                    <span uk-icon="icon: users; ratio: 0.8"></span>
                    Ver Membros
                  </button>
                </div>

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
