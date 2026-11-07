import React, { useEffect, useRef } from 'react';
import { NavLink } from 'react-router-dom';

interface Tab { to: string; label: string }

// A comunidade tem só o que não é publicação: quem somos, quando nos encontramos e quem participa.
// Tudo o que se publica (vídeos, orações, devocionais, enquetes, encontros) está no feed.
export const COMMUNITY_TABS: Tab[] = [
  { to: '/comunidade', label: 'Visão geral' },
  { to: '/events', label: 'Agenda' },
  { to: '/users', label: 'Membros' },
];

export const LEADER_TABS: Tab[] = [
  { to: '/dashboard', label: 'Painel' },
  { to: '/reports', label: 'Relatórios' },
];

/** Separadores de uma área (comunidade ou liderança); o ativo fica visível no telemóvel. */
const SectionTabs: React.FC<{ tabs: Tab[]; label: string }> = ({ tabs, label }) => {
  const nav = useRef<HTMLElement>(null);

  useEffect(() => {
    const active = nav.current?.querySelector<HTMLElement>('.is-active');
    if (active && nav.current) nav.current.scrollLeft = active.offsetLeft - (nav.current.clientWidth - active.offsetWidth) / 2;
  }, []);

  return (
    <nav ref={nav} className="tabs" aria-label={label}>
      {tabs.map(tab => (
        <NavLink key={tab.to} to={tab.to} end className={({ isActive }) => `tab${isActive ? ' is-active' : ''}`}>
          {tab.label}
        </NavLink>
      ))}
    </nav>
  );
};

export const CommunityTabs = () => <SectionTabs tabs={COMMUNITY_TABS} label="Secções da comunidade" />;
export const LeaderTabs = () => <SectionTabs tabs={LEADER_TABS} label="Liderança" />;

export default SectionTabs;
