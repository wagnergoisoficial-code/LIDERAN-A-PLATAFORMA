import React, { useState, useEffect } from 'react';
import { api } from '../services/api';
import { useAuth } from '../context/AuthContext';
import UIkit from 'uikit';
import PageHeader from '../components/PageHeader';
import EmptyState from '../components/EmptyState';

interface Attendee { id: string; name: string; profileImage?: string; }
interface Event {
  id: string; title: string; description?: string; location?: string;
  startDate: string; endDate?: string; imageUrl?: string;
  createdBy: string; createdAt: string;
  goingCount: number; maybeCount: number; myStatus: string | null;
  attendees: Attendee[];
}

const formatDate = (d: string) => new Date(d).toLocaleDateString('pt-BR', { weekday: 'short', day: '2-digit', month: 'short', year: 'numeric' });
const formatTime = (d: string) => new Date(d).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });

const Events: React.FC = () => {
  const { user } = useAuth();
  const [events, setEvents] = useState<Event[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [form, setForm] = useState({ title: '', description: '', location: '', startDate: '', endDate: '' });
  const [saving, setSaving] = useState(false);

  const load = async () => {
    try {
      const res = await api.getEvents();
      if (res.success) setEvents(res.data);
    } catch { /* silent */ }
    finally { setLoading(false); }
  };

  useEffect(() => { load(); }, []);

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    try {
      const res = await api.createEvent(form);
      if (res.success) {
        setEvents(prev => [res.data, ...prev]);
        setShowModal(false);
        setForm({ title: '', description: '', location: '', startDate: '', endDate: '' });
        UIkit.notification({ message: 'Evento criado!', status: 'success', pos: 'top-right' });
      }
    } catch (err: any) {
      UIkit.notification({ message: err.message || 'Erro ao criar evento', status: 'danger', pos: 'top-right' });
    } finally { setSaving(false); }
  };

  const handleRsvp = async (eventId: string, status: string) => {
    try {
      await api.rsvpEvent(eventId, status);
      setEvents(prev => prev.map(e => e.id === eventId ? { ...e, myStatus: status === 'none' ? null : status } : e));
    } catch (err: any) {
      UIkit.notification({ message: err.message || 'Erro', status: 'danger', pos: 'top-right' });
    }
  };

  const handleDelete = async (eventId: string) => {
    try {
      await api.deleteEvent(eventId);
      setEvents(prev => prev.filter(e => e.id !== eventId));
      UIkit.notification({ message: 'Evento removido', status: 'success', pos: 'top-right' });
    } catch (err: any) {
      UIkit.notification({ message: err.message || 'Erro', status: 'danger', pos: 'top-right' });
    }
  };

  const upcoming = events.filter(e => new Date(e.startDate) >= new Date());
  const past = events.filter(e => new Date(e.startDate) < new Date());

  return (
    <div>
        <PageHeader
          icon="calendar"
          title="Agenda"
          subtitle="Eventos e atividades da comunidade"
          actions={(user?.role === 'leader' || user?.role === 'admin') && (
            <button className="uk-button uk-button-primary" onClick={() => setShowModal(true)}>
              <span uk-icon="icon: plus; ratio: 0.85"></span> Novo Evento
            </button>
          )}
        />

        {loading ? (
          <div style={{ textAlign: 'center', padding: '60px', color: 'var(--text-muted)' }}>
            <span uk-spinner="ratio: 1.2"></span>
          </div>
        ) : (
          <>
            {/* Upcoming */}
            {upcoming.length > 0 && (
              <div style={{ marginBottom: '32px' }}>
                <div className="list-label">Próximos</div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                  {upcoming.map(ev => <EventCard key={ev.id} event={ev} userId={user?.id || ''} userRole={user?.role || ''} onRsvp={handleRsvp} onDelete={handleDelete} />)}
                </div>
              </div>
            )}

            {/* Past */}
            {past.length > 0 && (
              <div>
                <div className="list-label">Passados</div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                  {past.map(ev => <EventCard key={ev.id} event={ev} userId={user?.id || ''} userRole={user?.role || ''} onRsvp={handleRsvp} onDelete={handleDelete} past />)}
                </div>
              </div>
            )}

            {events.length === 0 && (
              <EmptyState icon="calendar" title="Nenhum evento ainda" text="Os eventos da comunidade aparecem aqui" />
            )}
          </>
        )}

      {/* Create Modal */}
      {showModal && (
        <div className="modal-overlay" onClick={() => setShowModal(false)}>
          <div className="modal-box" style={{ maxWidth: '480px' }} onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <h4>Novo Evento</h4>
              <button className="modal-close-btn" onClick={() => setShowModal(false)}><span uk-icon="icon: close; ratio: 0.9"></span></button>
            </div>
            <form onSubmit={handleCreate}>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
                <div>
                  <label className="form-label">Título *</label>
                  <input className="form-input uk-width-1-1" type="text" placeholder="Nome do evento" value={form.title} onChange={e => setForm(f => ({ ...f, title: e.target.value }))} required />
                </div>
                <div>
                  <label className="form-label">Descrição</label>
                  <textarea className="form-input uk-width-1-1" placeholder="Detalhes do evento" rows={3} style={{ height: 'auto', padding: '8px' }} value={form.description} onChange={e => setForm(f => ({ ...f, description: e.target.value }))} />
                </div>
                <div>
                  <label className="form-label">Local</label>
                  <input className="form-input uk-width-1-1" type="text" placeholder="Endereço ou local" value={form.location} onChange={e => setForm(f => ({ ...f, location: e.target.value }))} />
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                    <label className="form-label" style={{ margin: 0 }}>Início *</label>
                    <input className="form-input uk-width-1-1" type="datetime-local" value={form.startDate} onChange={e => setForm(f => ({ ...f, startDate: e.target.value }))} required />
                  </div>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                    <label className="form-label" style={{ margin: 0 }}>Fim</label>
                    <input className="form-input uk-width-1-1" type="datetime-local" value={form.endDate} onChange={e => setForm(f => ({ ...f, endDate: e.target.value }))} />
                  </div>
                </div>
              </div>
              <div className="form-btn-row" style={{ marginTop: '20px' }}>
                <button type="button" className="form-btn" onClick={() => setShowModal(false)}>Cancelar</button>
                <button type="submit" className="form-btn primary" disabled={saving}>
                  {saving ? <><span uk-spinner="ratio: 0.5"></span> Salvando...</> : 'Criar Evento'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

interface EventCardProps {
  event: Event; userId: string; userRole: string;
  onRsvp: (id: string, status: string) => void;
  onDelete: (id: string) => void;
  past?: boolean;
}

const EventCard: React.FC<EventCardProps> = ({ event, userId, userRole, onRsvp, onDelete, past }) => {
  const canDelete = event.createdBy === userId || userRole === 'admin';
  const rsvpStatus = event.myStatus;

  return (
    <div className="card" style={{ background: past ? 'var(--bg-surface)' : 'var(--bg)', opacity: past ? 0.7 : 1 }}>
      <div style={{ display: 'flex', gap: '0' }}>
        {/* Date column */}
        <div style={{ width: '72px', flexShrink: 0, background: 'var(--bg-surface)', borderRight: '1px solid var(--border)', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '16px 8px' }}>
          <span style={{ fontSize: '22px', fontWeight: 800, color: past ? 'var(--text-muted)' : 'var(--text)', lineHeight: 1 }}>
            {new Date(event.startDate).getDate()}
          </span>
          <span style={{ fontSize: '11px', fontWeight: 600, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
            {new Date(event.startDate).toLocaleDateString('pt-BR', { month: 'short' })}
          </span>
        </div>

        {/* Content */}
        <div style={{ flex: 1, padding: '14px 16px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '6px' }}>
            <div>
              <div style={{ fontWeight: 700, fontSize: '14px', color: 'var(--text)', marginBottom: '2px' }}>{event.title}</div>
              <div style={{ display: 'flex', gap: '12px', alignItems: 'center', flexWrap: 'wrap' }}>
                <span style={{ fontSize: '12px', color: 'var(--text-muted)', display: 'flex', alignItems: 'center', gap: '4px' }}>
                  <span uk-icon="icon: clock; ratio: 0.75"></span>
                  {formatTime(event.startDate)}{event.endDate ? ` — ${formatTime(event.endDate)}` : ''}
                </span>
                {event.location && (
                  <span style={{ fontSize: '12px', color: 'var(--text-muted)', display: 'flex', alignItems: 'center', gap: '4px' }}>
                    <span uk-icon="icon: location; ratio: 0.75"></span>
                    {event.location}
                  </span>
                )}
              </div>
            </div>
            {canDelete && (
              <button className="uk-button uk-button-danger uk-button-small" title="Excluir evento" onClick={() => onDelete(event.id)}>
                <span uk-icon="icon: trash; ratio: 0.75"></span> Excluir
              </button>
            )}
          </div>

          {event.description && (
            <p style={{ margin: '8px 0', fontSize: '13px', color: 'var(--text-muted)', lineHeight: 1.5 }}>{event.description}</p>
          )}

          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginTop: '10px' }}>
            <div style={{ fontSize: '12px', color: 'var(--text-muted)', display: 'flex', gap: '12px' }}>
              <span><strong style={{ color: 'var(--text)' }}>{event.goingCount}</strong> confirmados</span>
              {event.maybeCount > 0 && <span><strong style={{ color: 'var(--text)' }}>{event.maybeCount}</strong> talvez</span>}
            </div>
            {!past && (
              <div style={{ display: 'flex', gap: '6px' }}>
                {(['going', 'maybe', 'not_going'] as const).map(s => {
                  const labels = { going: 'Vou', maybe: 'Talvez', not_going: 'Não vou' };
                  const isActive = rsvpStatus === s;
                  return (
                    <button key={s} onClick={() => onRsvp(event.id, isActive ? 'none' : s)}
                      style={{ height: '30px', padding: '0 12px', fontSize: '12px', fontWeight: 600, fontFamily: 'inherit', borderRadius: 'var(--radius-sm)', border: `1px solid ${isActive ? 'var(--accent)' : 'var(--border-strong)'}`, background: isActive ? 'var(--accent)' : 'transparent', color: isActive ? '#fff' : 'var(--text-muted)', cursor: 'pointer' }}>
                      {labels[s]}
                    </button>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default Events;
