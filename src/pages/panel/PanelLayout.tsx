import React from 'react';
import { NavLink, Navigate, Outlet } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { useCommunity } from '../../lib/community';
import { Area, canOpen, isLeader, panelLabel } from '../../lib/cargos';
import Icon, { IconName } from '../../components/Icon';
import ChurchMembers from '../../components/ChurchMembers';
import PageHeader from '../../components/PageHeader';

interface Group { area: Area; title: string; links: { to: string; label: string; icon: IconName }[] }

// Cada pessoa vê só a área do seu cargo; a liderança vê todas
const GROUPS: Group[] = [
  { area: 'lideranca', title: 'Liderança', links: [
    { to: '/painel/lideranca', label: 'Comunidade', icon: 'dashboard' },
    { to: '/painel/cargos', label: 'Cargos', icon: 'badge' },
    { to: '/painel/relatorios', label: 'Relatórios', icon: 'reports' },
  ] },
  { area: 'secretario', title: 'Secretaria', links: [
    { to: '/painel/membros', label: 'Membros', icon: 'users' },
    { to: '/painel/aniversarios', label: 'Aniversariantes', icon: 'cake' },
    { to: '/painel/documentos', label: 'Documentos', icon: 'file-text' },
  ] },
  { area: 'tesoureiro', title: 'Tesouraria', links: [
    { to: '/painel/tesouraria', label: 'Lançamentos', icon: 'wallet' },
  ] },
  { area: 'regente', title: 'Regência', links: [
    { to: '/painel/repertorio', label: 'Repertório', icon: 'music' },
  ] },
];

const useGroups = () => {
  const { user } = useAuth();
  // Sem comunidade (líder por verificar), só a página da liderança
  if (!user?.churchId) return isLeader(user) ? [{ ...GROUPS[0], links: GROUPS[0].links.slice(0, 1) }] : [];
  return GROUPS.filter(g => canOpen(user, g.area));
};

/** Painel em largura total, com a navegação das áreas à esquerda. */
const PanelLayout = () => {
  const { user } = useAuth();
  const groups = useGroups();
  if (!groups.length) return <Navigate to="/" replace />;

  return (
    <div className="panel">
      <nav className="panel-nav" aria-label={panelLabel(user)}>
        {groups.map(group => (
          <div key={group.area} className="panel-nav-group">
            <p className="panel-nav-title">{group.title}</p>
            {group.links.map(link => (
              <NavLink key={link.to} to={link.to} className={({ isActive }) => `panel-nav-link${isActive ? ' is-active' : ''}`}>
                <Icon name={link.icon} size={18} /> {link.label}
              </NavLink>
            ))}
          </div>
        ))}
      </nav>
      <div className="panel-main"><Outlet /></div>
    </div>
  );
};

/** /painel abre a primeira área a que a pessoa tem acesso. */
export const PanelHome = () => {
  const groups = useGroups();
  return <Navigate to={groups[0]?.links[0].to || '/'} replace />;
};

/** Cada página do painel confere o cargo (o servidor confere outra vez). */
export const PanelGuard: React.FC<{ area: Area; children: React.ReactNode }> = ({ area, children }) => {
  const { user } = useAuth();
  if (!canOpen(user, area) || (area !== 'lideranca' && !user?.churchId)) return <Navigate to="/painel" replace />;
  return <>{children}</>;
};

/** Secretaria: cadastro e dados dos membros (a moderação fica com a liderança). */
export const PanelMembers = () => {
  const { user } = useAuth();
  const { community } = useCommunity();
  const leader = isLeader(user);
  return (
    <div>
      <PageHeader title="Membros" subtitle="Cadastre novos membros e mantenha os dados em dia." />
      <ChurchMembers churchId={user!.churchId!} churchName={community?.name || ''}
        canChangeRoles={leader && (!!community?.isOwner || user?.role === 'admin')} editOnly={!leader} />
    </div>
  );
};

export default PanelLayout;
