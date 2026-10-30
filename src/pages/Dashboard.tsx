import { useState, useEffect } from 'react';
import { api } from '../services/api';
import { useAuth } from '../context/AuthContext';
import ChurchCreate from '../components/ChurchCreate';
import ChurchMembers from '../components/ChurchMembers';

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
    <div style={{ display: 'flex', minHeight: 'calc(100vh - 80px)', background: 'var(--bg)' }}>

      {/* ── SIDEBAR ─────────────────────────────────────────────── */}
      <aside style={{
        width: '220px',
        background: 'var(--bg-surface)',
        borderRight: '1px solid var(--border)',
        display: 'flex',
        flexDirection: 'column',
        flexShrink: 0
      }}>
        {/* Sidebar header */}
        <div style={{ padding: '16px 16px 12px', borderBottom: '1px solid var(--border)' }}>
          <div style={{ fontSize: '11px', fontWeight: 700, letterSpacing: '0.07em', textTransform: 'uppercase', color: 'var(--text-faint)', marginBottom: '2px' }}>
            Painel do Líder
          </div>
          <div style={{ fontSize: '12px', color: 'var(--text-muted)' }}>Gerencie suas comunidades</div>
        </div>

        {/* Create button */}
        <div style={{ padding: '12px 12px 8px' }}>
          <button
            onClick={() => setShowCreateForm(!showCreateForm)}
            style={{
              width: '100%',
              padding: '0 12px',
              height: '32px',
              background: showCreateForm ? 'var(--accent)' : 'transparent',
              color: showCreateForm ? '#fff' : 'var(--text-muted)',
              border: `1px solid ${showCreateForm ? 'var(--accent)' : 'var(--border-strong)'}`,
              fontSize: '12px',
              fontFamily: 'inherit',
              fontWeight: 500,
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
              transition: 'all 160ms ease'
            }}
            onMouseEnter={(e) => {
              if (!showCreateForm) {
                e.currentTarget.style.background = 'var(--bg-elevated)';
                e.currentTarget.style.color = 'var(--text)';
              }
            }}
            onMouseLeave={(e) => {
              if (!showCreateForm) {
                e.currentTarget.style.background = 'transparent';
                e.currentTarget.style.color = 'var(--text-muted)';
              }
            }}
          >
            <span uk-icon={`icon: ${showCreateForm ? 'close' : 'plus'}; ratio: 0.8`}></span>
            {showCreateForm ? 'Cancelar' : 'Nova Comunidade'}
          </button>
        </div>

        <div style={{ height: '1px', background: 'var(--border)', margin: '4px 12px' }}></div>

        {/* Church list */}
        <div style={{ flex: 1, overflowY: 'auto' }}>
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
                    background: active ? 'var(--accent-light)' : 'transparent',
                    color: active ? 'var(--accent-dark)' : 'var(--text-muted)',
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
        </div>
      </aside>

      {/* ── MAIN CONTENT ────────────────────────────────────────── */}
      <main style={{ flex: 1, padding: '28px', overflowY: 'auto', background: 'var(--bg)' }}>

        {showCreateForm ? (
          <div>
            <div style={{ marginBottom: '24px', paddingBottom: '16px', borderBottom: '1px solid var(--border)' }}>
              <h2 style={{ margin: 0, fontSize: '20px', fontWeight: 700, letterSpacing: '-0.02em' }}>
                Nova Comunidade
              </h2>
            </div>
            <div style={{ maxWidth: '600px' }}>
              <ChurchCreate onChurchCreated={handleChurchCreated} />
            </div>
          </div>

        ) : selectedChurch ? (
          <div>
            {/* Church header */}
            <div style={{ marginBottom: '28px', paddingBottom: '20px', borderBottom: '1px solid var(--border)' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                <div>
                  <h2 style={{ margin: '0 0 4px', fontSize: '22px', fontWeight: 700, letterSpacing: '-0.02em' }}>
                    {selectedChurch.name}
                  </h2>
                  {selectedChurch.title && (
                    <p style={{ margin: 0, fontSize: '13px', color: 'var(--text-muted)' }}>
                      {selectedChurch.title}
                    </p>
                  )}
                </div>
                <button
                  onClick={() => setShowMembersModal(true)}
                  style={{
                    padding: '0 16px',
                    height: '34px',
                    background: 'var(--bg)',
                    color: 'var(--text)',
                    border: '1px solid var(--border-strong)',
                    fontSize: '13px',
                    fontFamily: 'inherit',
                    fontWeight: 500,
                    cursor: 'pointer',
                    display: 'flex', alignItems: 'center', gap: '6px',
                    transition: 'all 160ms ease',
                    whiteSpace: 'nowrap'
                  }}
                  onMouseEnter={(e) => { e.currentTarget.style.borderColor = 'var(--accent)'; e.currentTarget.style.color = 'var(--accent)'; }}
                  onMouseLeave={(e) => { e.currentTarget.style.borderColor = 'var(--border-strong)'; e.currentTarget.style.color = 'var(--text)'; }}
                >
                  <span uk-icon="icon: users; ratio: 0.85"></span>
                  Ver Membros
                </button>
              </div>
            </div>

            {/* Info section */}
            <div style={{ border: '1px solid var(--border)', background: 'var(--bg)' }}>
              <div style={{ padding: '12px 16px', background: 'var(--bg-surface)', borderBottom: '1px solid var(--border)' }}>
                <span style={{ fontSize: '11px', fontWeight: 700, letterSpacing: '0.07em', textTransform: 'uppercase', color: 'var(--text-muted)' }}>
                  Informações
                </span>
              </div>
              <div style={{ padding: '20px' }}>
                {selectedChurch.description ? (
                  <div style={{ marginBottom: selectedChurch.cultosDias?.length ? '20px' : 0 }}>
                    <div style={{ fontSize: '11px', fontWeight: 700, letterSpacing: '0.07em', textTransform: 'uppercase', color: 'var(--text-faint)', marginBottom: '6px' }}>
                      Descrição
                    </div>
                    <p style={{ margin: 0, fontSize: '13px', color: 'var(--text)', lineHeight: 1.6 }}>
                      {selectedChurch.description}
                    </p>
                  </div>
                ) : (
                  <p style={{ margin: 0, fontSize: '13px', color: 'var(--text-faint)' }}>Sem descrição cadastrada.</p>
                )}

                {selectedChurch.cultosDias && selectedChurch.cultosDias.length > 0 && (
                  <div>
                    <div style={{ fontSize: '11px', fontWeight: 700, letterSpacing: '0.07em', textTransform: 'uppercase', color: 'var(--text-faint)', marginBottom: '8px' }}>
                      Dias de Culto
                    </div>
                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px' }}>
                      {selectedChurch.cultosDias.map((dia) => (
                        <span key={dia} style={{
                          display: 'inline-block',
                          padding: '3px 10px',
                          background: 'var(--accent-light)',
                          border: '1px solid var(--accent)',
                          color: 'var(--accent-dark)',
                          fontSize: '11px',
                          fontWeight: 600,
                          textTransform: 'capitalize',
                          letterSpacing: '0.03em'
                        }}>
                          {dia}
                        </span>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* Members section */}
            <div style={{ marginTop: '24px' }}>
              <ChurchMembers churchId={selectedChurch.id} churchName={selectedChurch.name} />
            </div>
          </div>

        ) : (
          <div style={{ textAlign: 'center', padding: '80px 20px', color: 'var(--text-faint)' }}>
            <span uk-icon="icon: list; ratio: 2.5" style={{ display: 'block', marginBottom: '16px', color: 'var(--border-strong)' }}></span>
            <p style={{ fontSize: '14px', margin: 0, color: 'var(--text-muted)' }}>
              Selecione uma comunidade ou crie uma nova
            </p>
          </div>
        )}
      </main>

      {/* ── MEMBERS MODAL ───────────────────────────────────────── */}
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
