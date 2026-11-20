import { useState, useEffect } from 'react';
import UIkit from 'uikit';
import { api } from '../services/api';
import { useAuth } from '../context/AuthContext';
import { listDays, plural } from '../lib/format';
import ChurchCreate from '../components/ChurchCreate';
import ChurchMembers from '../components/ChurchMembers';
import ReportsPanel from '../components/ReportsPanel';
import LeaderVerificationCard from '../components/LeaderVerificationCard';
import VerificationsPanel from '../components/VerificationsPanel';
import InviteLink from '../components/InviteLink';
import CommunityConversations from '../components/CommunityConversations';
import RetiredDevotionals from '../components/RetiredDevotionals';
import PageHeader from '../components/PageHeader';
import EmptyState from '../components/EmptyState';
import Icon from '../components/Icon';
import MoreMenu, { MenuAction } from '../components/MoreMenu';

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

const notify = (message: string, status: 'success' | 'danger' = 'danger') => UIkit.notification({ message, status, pos: 'top-right' });

// Área de liderança: comunidades, convite, denúncias, conversas e membros
const Dashboard = () => {
  const { user, applySession } = useAuth();
  const [churches, setChurches] = useState<Church[]>([]);
  const [selectedChurch, setSelectedChurch] = useState<Church | null>(null);
  const [loading, setLoading] = useState(true);
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [editing, setEditing] = useState(false);
  const [busy, setBusy] = useState(false);

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
      notify(err.message || 'Não foi possível carregar as comunidades');
    } finally {
      setLoading(false);
    }
  };

  // eslint-disable-next-line react-hooks/exhaustive-deps
  useEffect(() => { loadChurches(); }, [user?.churchId]);

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
      notify(res.message || 'Comunidade ativada', 'success');
    } catch (err: any) {
      notify(err.message || 'Não foi possível ativar a comunidade');
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
      notify('Comunidade excluída', 'success');
    } catch (err: any) {
      notify(err.message || 'Não foi possível excluir a comunidade');
    } finally {
      setBusy(false);
    }
  };

  // Líder ainda por verificar e sem comunidade: só o pedido de verificação.
  // Um colíder (tornado líder por outro) gere a comunidade dele sem verificação.
  const unverified = user?.role === 'leader' && user.leaderVerified === false;
  if (unverified && !user?.churchId) {
    return (
      <div className="page is-medium">
        <PageHeader title="Painel do líder" subtitle="Antes de criar a comunidade, confirmamos que você é líder de uma igreja." />
        <LeaderVerificationCard />
      </div>
    );
  }

  const churchActions: MenuAction[] = selectedChurch ? [
    { label: 'Editar dados', icon: 'pencil', onSelect: () => { setEditing(true); setShowCreateForm(false); } },
    ...((selectedChurch.isOwner || user?.role === 'admin') ? [{ label: 'Excluir comunidade', icon: 'trash' as const, danger: true, disabled: busy, onSelect: () => handleDelete(selectedChurch) }] : []),
  ] : [];

  return (
    <div>
      <PageHeader
        title="Painel do líder"
        subtitle="Suas comunidades: convites, denúncias, conversas e membros."
        actions={!unverified && (
          <button type="button" className={`uk-button ${showCreateForm ? 'uk-button-default' : 'uk-button-primary'}`}
            onClick={() => { setShowCreateForm(!showCreateForm); setEditing(false); }}>
            <Icon name={showCreateForm ? 'close' : 'plus'} size={18} />
            {showCreateForm ? 'Cancelar' : 'Nova comunidade'}
          </button>
        )}
      />

      {user?.role === 'admin' && <VerificationsPanel />}

      <div className="dash-layout">
        <aside aria-labelledby="churches-title">
          <h2 id="churches-title" className="list-label">Comunidades{!loading && churches.length ? ` · ${churches.length}` : ''}</h2>
          <div className="card">
            {loading ? (
              <div className="loading-block" style={{ padding: '24px' }}><span uk-spinner="ratio: 0.7"></span></div>
            ) : churches.length === 0 ? (
              <p className="list-empty">Você ainda não criou nenhuma comunidade.</p>
            ) : churches.map(church => {
              const active = selectedChurch?.id === church.id;
              return (
                <button key={church.id} type="button" className={`church-pick${active ? ' is-active' : ''}`} aria-current={active ? 'true' : undefined}
                  onClick={() => { setSelectedChurch(church); setShowCreateForm(false); setEditing(false); }}>
                  <span className="church-pick-name">
                    <span className="truncate">{church.name}</span>
                    {church.isActive && <span className="tag">Ativa</span>}
                  </span>
                  <span className="church-pick-meta" style={{ display: 'block' }}>{plural(church.memberCount ?? church.users?.length ?? 0, 'membro', 'membros')}</span>
                </button>
              );
            })}
          </div>
        </aside>

        <div style={{ minWidth: 0 }}>
          {showCreateForm || (editing && selectedChurch) ? (
            <div style={{ maxWidth: '640px' }}>
              <ChurchCreate
                key={editing ? selectedChurch?.id : 'new'}
                church={editing && selectedChurch ? selectedChurch : undefined}
                onChurchCreated={handleChurchCreated}
                onCancel={editing ? () => setEditing(false) : () => setShowCreateForm(false)}
              />
            </div>
          ) : selectedChurch ? (
            <div>
              <section className="community-head" aria-labelledby="selected-church">
                <div className="community-head-row">
                  <div style={{ minWidth: 0 }}>
                    <h2 id="selected-church" className="community-name" style={{ fontSize: '20px' }}>{selectedChurch.name}</h2>
                    {selectedChurch.title && <p className="community-church">{selectedChurch.title}</p>}
                  </div>
                  <div className="community-actions" style={{ alignItems: 'center' }}>
                    {selectedChurch.isActive ? (
                      <span className="tag">Comunidade ativa</span>
                    ) : (
                      <button type="button" className="uk-button uk-button-primary uk-button-small" disabled={busy} onClick={() => handleActivate(selectedChurch)}>
                        <Icon name="check" size={16} /> Tornar ativa
                      </button>
                    )}
                    <MoreMenu actions={churchActions} label={`Opções de ${selectedChurch.name}`} />
                  </div>
                </div>
                <div className="community-facts">
                  <span><Icon name="users" size={18} /> {plural(selectedChurch.memberCount ?? 0, 'membro', 'membros')}</span>
                  {!!selectedChurch.cultosDias?.length && <span><Icon name="calendar" size={18} /> Cultos: {listDays(selectedChurch.cultosDias)}</span>}
                </div>
                <p className="community-desc" style={{ color: selectedChurch.description ? undefined : 'var(--text-muted)' }}>
                  {selectedChurch.description || 'Sem descrição. Use "Editar dados" no menu ⋯ para apresentar a comunidade.'}
                </p>
                {!selectedChurch.isActive && (
                  <p className="form-hint">O feed, o chat, a agenda e as outras páginas mostram a comunidade ativa. Torne esta ativa para publicar nela.</p>
                )}
              </section>

              <div className="section"><InviteLink churchId={selectedChurch.id} /></div>
              <div className="section"><ReportsPanel churchId={selectedChurch.id} /></div>
              <div className="section"><CommunityConversations churchId={selectedChurch.id} /></div>
              {selectedChurch.isActive && <div className="section"><RetiredDevotionals /></div>}
              <div className="section">
                <ChurchMembers churchId={selectedChurch.id} churchName={selectedChurch.name} canChangeRoles={!!selectedChurch.isOwner || user?.role === 'admin'} />
              </div>
            </div>
          ) : (
            <div className="card">
              <EmptyState icon="users" title="Escolha uma comunidade ou crie uma nova" />
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default Dashboard;
