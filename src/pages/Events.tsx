import React, { useState, useEffect } from 'react';
import UIkit from 'uikit';
import { api } from '../services/api';
import { useAuth } from '../context/AuthContext';
import { timeOnly } from '../lib/format';
import { pop, burst } from '../lib/motion';
import PageHeader from '../components/PageHeader';
import EmptyState from '../components/EmptyState';
import AnimatedNumber from '../components/AnimatedNumber';
import MonthCalendar, { dayKey } from '../components/MonthCalendar';
import DateChip from '../components/DateChip';
import Icon from '../components/Icon';
import MoreMenu from '../components/MoreMenu';
import { EventFormModal } from '../components/EventForm';
import { CommunityTabs } from '../components/SectionTabs';
import { announceFeedChange } from '../lib/community';

interface Attendee { id: string; name: string; profileImage?: string; }
interface Event {
  id: string; title: string; description?: string; location?: string;
  startDate: string; endDate?: string; imageUrl?: string;
  createdBy: string; createdAt: string;
  goingCount: number; maybeCount: number; myStatus: string | null;
  attendees: Attendee[];
}

const byStartDate = (a: Event, b: Event) => new Date(a.startDate).getTime() - new Date(b.startDate).getTime();
const RSVP_LABELS = { going: 'Vou', maybe: 'Talvez', not_going: 'Não vou' } as const;

const Events: React.FC = () => {
  const { user } = useAuth();
  const isLeader = user?.role === 'leader' || user?.role === 'admin';
  const [events, setEvents] = useState<Event[]>([]);
  const [loading, setLoading] = useState(true);
  // null: fechado; 'new': criar; um encontro: editar
  const [modal, setModal] = useState<Event | 'new' | null>(null);
  const [selectedDay, setSelectedDay] = useState<string | null>(null);

  const openCreate = () => setModal('new');
  const openEdit = (ev: Event) => setModal(ev);

  useEffect(() => {
    api.getEvents()
      .then(res => { if (res.success) setEvents([...res.data].sort(byStartDate)); })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  // O encontro novo também aparece no feed
  const handleSaved = (saved: Event) => {
    setEvents(prev => [...prev.filter(ev => ev.id !== saved.id), saved].sort(byStartDate));
    if (modal === 'new') announceFeedChange('event', saved);
    setModal(null);
  };

  const handleRsvp = async (eventId: string, status: string) => {
    try {
      const res = await api.rsvpEvent(eventId, status);
      if (res.success && res.data) setEvents(prev => prev.map(e => e.id === eventId ? res.data : e));
    } catch (err: any) {
      UIkit.notification({ message: err.message || 'Não foi possível responder', status: 'danger', pos: 'top-right' });
    }
  };

  const handleDelete = async (eventId: string) => {
    if (!confirm('Excluir este encontro?')) return;
    try {
      await api.deleteEvent(eventId);
      setEvents(prev => prev.filter(e => e.id !== eventId));
      UIkit.notification({ message: 'Encontro excluído', status: 'success', pos: 'top-right' });
    } catch (err: any) {
      UIkit.notification({ message: err.message || 'Não foi possível excluir', status: 'danger', pos: 'top-right' });
    }
  };

  const now = new Date();
  const upcoming = events.filter(e => new Date(e.startDate) >= now);
  const past = events.filter(e => new Date(e.startDate) < now).reverse();
  const ofDay = selectedDay ? events.filter(e => dayKey(new Date(e.startDate)) === selectedDay) : [];

  const list = (items: Event[]) => (
    <div className="card stagger">
      {items.map(ev => (
        <EventRow key={ev.id} event={ev} canManage={ev.createdBy === user?.id || isLeader} past={new Date(ev.startDate) < now}
          onRsvp={handleRsvp} onDelete={handleDelete} onEdit={openEdit} />
      ))}
    </div>
  );

  return (
    <div className="page is-medium">
      <CommunityTabs />
      <PageHeader
        title="Agenda"
        subtitle="Encontros e atividades da comunidade"
        actions={isLeader && (
          <button type="button" className="uk-button uk-button-primary" onClick={openCreate}>
            <Icon name="plus" size={18} /> Novo encontro
          </button>
        )}
      />

      {loading ? (
        <div className="loading-block" role="status" aria-label="Carregando a agenda"><span uk-spinner="ratio: 1"></span></div>
      ) : (
        <>
          <MonthCalendar events={events} selected={selectedDay} onSelect={setSelectedDay} />

          {selectedDay ? (
            <section className="section" aria-live="polite">
              <div className="section-head">
                <h2 className="list-label">
                  {new Date(`${selectedDay}T00:00:00`).toLocaleDateString('pt-BR', { weekday: 'long', day: 'numeric', month: 'long' })}
                </h2>
                <button type="button" className="link-btn" onClick={() => setSelectedDay(null)}>Ver todos</button>
              </div>
              {list(ofDay)}
            </section>
          ) : (
            <>
              {upcoming.length > 0 && (
                <section className="section">
                  <h2 className="list-label">Próximos</h2>
                  {list(upcoming)}
                </section>
              )}
              {past.length > 0 && (
                <section className="section">
                  <h2 className="list-label">Já aconteceram</h2>
                  {list(past)}
                </section>
              )}
            </>
          )}

          {events.length === 0 && (
            <div className="card">
              <EmptyState icon="calendar" title="Ainda não há encontros" text={isLeader ? 'Marque o primeiro encontro da comunidade.' : 'Os encontros da comunidade aparecem aqui.'}
                action={isLeader && <button type="button" className="uk-button uk-button-primary" onClick={openCreate}>Novo encontro</button>} />
            </div>
          )}
        </>
      )}

      {modal && (
        <EventFormModal event={modal === 'new' ? undefined : modal} onClose={() => setModal(null)} onSaved={handleSaved} />
      )}
    </div>
  );
};

interface EventRowProps {
  event: Event;
  canManage: boolean;
  past: boolean;
  onRsvp: (id: string, status: string) => void;
  onEdit: (event: Event) => void;
  onDelete: (id: string) => void;
}

const EventRow: React.FC<EventRowProps> = ({ event, canManage, past, onRsvp, onDelete, onEdit }) => (
  <article className={`event-row${past ? ' is-past' : ''}`} aria-labelledby={`event-${event.id}`}>
    <DateChip date={event.startDate} />
    <div className="event-main">
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: '8px' }}>
        <h3 id={`event-${event.id}`} className="event-title">{event.title}</h3>
        {canManage && (
          <MoreMenu label={`Opções de ${event.title}`} actions={[
            { label: 'Editar', icon: 'pencil', onSelect: () => onEdit(event) },
            { label: 'Excluir', icon: 'trash', danger: true, onSelect: () => onDelete(event.id) },
          ]} />
        )}
      </div>
      <div className="event-facts">
        <span><Icon name="clock" size={16} /> {timeOnly(event.startDate)}{event.endDate ? ` – ${timeOnly(event.endDate)}` : ''}</span>
        {event.location && <span><Icon name="location" size={16} /> {event.location}</span>}
      </div>
      {event.description && <p className="event-desc">{event.description}</p>}

      <div className="event-foot">
        <span className="event-count">
          <strong><AnimatedNumber value={event.goingCount} /></strong> {event.goingCount === 1 ? 'confirmado' : 'confirmados'}
          {event.maybeCount > 0 && <> · <strong><AnimatedNumber value={event.maybeCount} /></strong> talvez</>}
        </span>
        {!past && (
          <div className="segmented" role="group" aria-label={`Presença em ${event.title}`}>
            {(Object.keys(RSVP_LABELS) as (keyof typeof RSVP_LABELS)[]).map(s => {
              const isActive = event.myStatus === s;
              return (
                <button key={s} type="button" className="press" aria-pressed={isActive}
                  onClick={e => {
                    // Confirmar presença merece festa; "talvez"/"não vou" só o toque
                    if (!isActive && s === 'going') { pop(e.currentTarget, 1.12); burst(e.currentTarget, { count: 8, colors: ['--accent', '--success'] }); }
                    onRsvp(event.id, isActive ? 'none' : s);
                  }}>
                  {RSVP_LABELS[s]}
                </button>
              );
            })}
          </div>
        )}
      </div>
    </div>
  </article>
);

export default Events;
