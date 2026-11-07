import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { api } from '../services/api';
import { useAuth } from '../context/AuthContext';
import { useCommunity } from '../lib/community';
import { firstName, listDays, plural, timeOnly, dayLabel } from '../lib/format';
import Avatar from '../components/Avatar';
import Icon from '../components/Icon';
import DateChip from '../components/DateChip';
import EmptyState from '../components/EmptyState';
import { CommunityTabs } from '../components/SectionTabs';

interface EventItem { id: string; title: string; startDate: string; location?: string | null }
interface Member { id: string; name: string; profileImage?: string }

const SectionHead: React.FC<{ id: string; title: string; to: string; link: string }> = ({ id, title, to, link }) => (
  <div className="section-head">
    <h2 id={id} className="list-label">{title}</h2>
    <Link className="section-link" to={to}>{link}</Link>
  </div>
);

// Sobre a comunidade: quem somos, quando nos encontramos e quem participa (o resto está no feed)
const Community: React.FC = () => {
  const { user } = useAuth();
  const { community, loading: loadingCommunity } = useCommunity();
  const isLeader = user?.role === 'leader' || user?.role === 'admin';
  const [events, setEvents] = useState<EventItem[]>([]);
  const [members, setMembers] = useState<Member[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user?.churchId) { setLoading(false); return; }
    const now = Date.now();
    Promise.allSettled([
      api.getEvents().then(res => setEvents((res.data || [])
        .filter((e: EventItem) => new Date(e.startDate).getTime() >= now)
        .sort((a: EventItem, b: EventItem) => new Date(a.startDate).getTime() - new Date(b.startDate).getTime())
        .slice(0, 3))),
      api.getUsers().then(res => setMembers(res.data || [])),
    ]).finally(() => setLoading(false));
  }, [user?.churchId]);

  if (!user?.churchId) {
    return (
      <div className="page is-medium">
        <h1 className="page-title" style={{ marginBottom: '16px' }}>Comunidade</h1>
        <div className="card">
          <EmptyState
            icon="users"
            title="Você ainda não participa de uma comunidade"
            text={isLeader ? 'Crie sua comunidade no Painel do líder.' : 'Peça ao líder o link de convite da comunidade.'}
            action={isLeader && <Link className="uk-button uk-button-primary" to="/dashboard">Abrir o Painel do líder</Link>}
          />
        </div>
      </div>
    );
  }

  return (
    <div className="page is-medium">
      <CommunityTabs />

      <section className="community-head" aria-labelledby="community-name">
        <div className="community-head-row">
          <div style={{ minWidth: 0 }}>
            <h1 id="community-name" className="community-name">{community?.name || (loadingCommunity ? 'Carregando…' : 'Comunidade')}</h1>
            {community?.title && <p className="community-church">{community.title}</p>}
          </div>
          <div className="community-actions">
            <Link className="uk-button uk-button-primary" to="/chat"><Icon name="chat" size={18} /> Abrir o chat</Link>
            {isLeader && <Link className="uk-button uk-button-default" to="/dashboard">Gerenciar comunidade</Link>}
          </div>
        </div>
        <div className="community-facts">
          <span><Icon name="users" size={18} /> {plural(community?.memberCount ?? members.length, 'membro', 'membros')}</span>
          {!!community?.cultosDias?.length && <span><Icon name="calendar" size={18} /> Cultos: {listDays(community.cultosDias)}</span>}
        </div>
        {community?.description && <p className="community-desc">{community.description}</p>}
      </section>

      {loading ? (
        <div className="loading-block" role="status" aria-label="Carregando"><span uk-spinner="ratio: 1"></span></div>
      ) : (
        <>
          <section className="section" aria-labelledby="hub-events">
            <SectionHead id="hub-events" title="Próximos encontros" to="/events" link="Ver agenda" />
            <div className="card">
              {events.length === 0 ? (
                <p className="list-empty">Nenhum encontro marcado.</p>
              ) : events.map(e => (
                <Link key={e.id} to="/events" className="list-row">
                  <DateChip date={e.startDate} />
                  <span className="list-row-body">
                    <span className="list-row-title"><span>{e.title}</span></span>
                    <span className="list-row-meta" style={{ display: 'block' }}>
                      {dayLabel(e.startDate)} · {timeOnly(e.startDate)}{e.location ? ` · ${e.location}` : ''}
                    </span>
                  </span>
                  <Icon name="chevron-right" size={18} className="faint" />
                </Link>
              ))}
            </div>
          </section>

          <section className="section" aria-labelledby="hub-people">
            <SectionHead id="hub-people" title="Pessoas" to="/users" link="Ver todas" />
            <div className="card">
              {members.length === 0 ? (
                <p className="list-empty">Ainda não há membros nesta comunidade.</p>
              ) : (
                <div className="people-grid">
                  {members.slice(0, 16).map(m => (
                    <Link key={m.id} to={`/profile/${m.id}`} className="person" title={m.name} aria-label={m.name}>
                      <Avatar name={m.name} profileImage={m.profileImage} size={56} />
                      <span className="person-name" aria-hidden="true">{m.id === user.id ? 'Você' : firstName(m.name)}</span>
                    </Link>
                  ))}
                </div>
              )}
            </div>
          </section>
        </>
      )}
    </div>
  );
};

export default Community;
