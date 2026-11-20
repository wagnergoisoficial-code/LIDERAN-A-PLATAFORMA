import { useEffect, useState } from 'react';
import UIkit from 'uikit';
import { api } from '../../services/api';
import { useAuth } from '../../context/AuthContext';
import { isLeader } from '../../lib/cargos';
import { plural, timeOnly } from '../../lib/format';
import Icon from '../../components/Icon';
import PageHeader from '../../components/PageHeader';
import { EventFormModal } from '../../components/EventForm';

const MONTHS = ['Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho', 'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro'];
const time = (iso: string) => new Date(iso).getTime();

/** Secretaria: as atividades do ano, mês a mês. São os encontros da agenda (e aparecem no feed). */
const AnnualCalendar = () => {
  const { user } = useAuth();
  const now = new Date();
  const [year, setYear] = useState(now.getFullYear());
  const [events, setEvents] = useState<any[] | null>(null);
  const [form, setForm] = useState<{ event?: any } | null>(null);

  const load = () => api.getEvents()
    .then(res => setEvents(res.data || []))
    .catch(() => { setEvents([]); UIkit.notification({ message: 'Não foi possível carregar as atividades', status: 'danger', pos: 'top-right' }); });

  useEffect(() => { load(); }, []);

  const ofYear = (events || []).filter(e => new Date(e.startDate).getFullYear() === year).sort((a, b) => time(a.startDate) - time(b.startDate));

  return (
    <div>
      <PageHeader title="Calendário anual" subtitle="Organizar as atividades do ano. Cada atividade entra na agenda e no feed da comunidade."
        actions={<button type="button" className="uk-button uk-button-primary" onClick={() => setForm({})}><Icon name="plus" size={18} /> Nova atividade</button>} />

      <div className="section-head">
        <h2 className="list-label">{year} · {plural(ofYear.length, 'atividade', 'atividades')}</h2>
        <span style={{ display: 'flex', gap: '4px' }}>
          <button type="button" className="icon-btn" aria-label="Ano anterior" onClick={() => setYear(y => y - 1)}><Icon name="chevron-left" /></button>
          <button type="button" className="icon-btn" aria-label="Ano seguinte" onClick={() => setYear(y => y + 1)}><Icon name="chevron-right" /></button>
        </span>
      </div>

      {events === null ? (
        <div className="card loading-block"><span uk-spinner="ratio: 0.8"></span></div>
      ) : (
        <div className="year-grid">
          {MONTHS.map((name, month) => {
            const list = ofYear.filter(e => new Date(e.startDate).getMonth() === month);
            const current = year === now.getFullYear() && month === now.getMonth();
            return (
              <section key={name} className={`card year-month${current ? ' is-current' : ''}`} aria-labelledby={`mes-${month}`}>
                <h3 id={`mes-${month}`} className="year-month-name">{name}</h3>
                {list.length === 0 ? <p className="year-empty">Sem atividades</p> : list.map(e => {
                  const content = (
                    <>
                      <span className="year-day">{new Date(e.startDate).getDate()}</span>
                      <span style={{ minWidth: 0 }}>
                        <span className="year-event-title">{e.title}</span>
                        <span className="year-event-meta">{timeOnly(e.startDate)}{e.location ? ` · ${e.location}` : ''}</span>
                      </span>
                    </>
                  );
                  // Quem criou a atividade (ou a liderança) pode corrigi-la aqui
                  return isLeader(user) || e.createdBy === user?.id
                    ? <button key={e.id} type="button" className="year-event" title="Editar a atividade" onClick={() => setForm({ event: e })}>{content}</button>
                    : <div key={e.id} className="year-event">{content}</div>;
                })}
              </section>
            );
          })}
        </div>
      )}

      {form && <EventFormModal event={form.event} onClose={() => setForm(null)} onSaved={() => { setForm(null); load(); }} />}
    </div>
  );
};

export default AnnualCalendar;
