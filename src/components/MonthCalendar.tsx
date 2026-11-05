import React, { useState } from 'react';

const WEEKDAYS = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb'];

// Dia no fuso do navegador (aaaa-mm-dd), para agrupar eventos e comparar datas
export const dayKey = (d: Date) =>
  `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;

const firstOfMonth = (d: Date) => new Date(d.getFullYear(), d.getMonth(), 1);

interface CalendarEvent { id: string; title: string; startDate: string }

interface MonthCalendarProps {
  events: CalendarEvent[];
  selected: string | null;
  onSelect: (day: string | null) => void;
}

// Calendário do mês: cada dia mostra os seus eventos; clicar num dia com eventos filtra a lista
const MonthCalendar: React.FC<MonthCalendarProps> = ({ events, selected, onSelect }) => {
  const [month, setMonth] = useState(() => firstOfMonth(new Date()));

  const byDay = new Map<string, CalendarEvent[]>();
  events.forEach(e => {
    const key = dayKey(new Date(e.startDate));
    byDay.set(key, [...(byDay.get(key) || []), e]);
  });

  const daysInMonth = new Date(month.getFullYear(), month.getMonth() + 1, 0).getDate();
  const weeks = Math.ceil((month.getDay() + daysInMonth) / 7);
  const days = Array.from({ length: weeks * 7 }, (_, i) => new Date(month.getFullYear(), month.getMonth(), 1 - month.getDay() + i));
  const today = dayKey(new Date());
  const monthName = (d: Date) => d.toLocaleDateString('pt-BR', { month: 'long' });
  const title = month.toLocaleDateString('pt-BR', { month: 'long', year: 'numeric' });

  return (
    <div className="card calendar">
      <div className="calendar-head">
        <strong className="calendar-title">{title.charAt(0).toUpperCase() + title.slice(1)}</strong>
        <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
          <button type="button" className="uk-button uk-button-default uk-button-small" onClick={() => setMonth(firstOfMonth(new Date()))}>Hoje</button>
          <button type="button" className="action-btn" aria-label="Mês anterior" onClick={() => setMonth(m => new Date(m.getFullYear(), m.getMonth() - 1, 1))}>
            <span uk-icon="icon: chevron-left; ratio: 0.9"></span>
          </button>
          <button type="button" className="action-btn" aria-label="Mês seguinte" onClick={() => setMonth(m => new Date(m.getFullYear(), m.getMonth() + 1, 1))}>
            <span uk-icon="icon: chevron-right; ratio: 0.9"></span>
          </button>
        </div>
      </div>

      <div className="calendar-grid">
        {WEEKDAYS.map(w => <div key={w} className="calendar-weekday">{w}</div>)}
        {days.map(d => {
          const key = dayKey(d);
          const list = byDay.get(key) || [];
          const className = [
            'calendar-day',
            d.getMonth() !== month.getMonth() && 'is-outside',
            key === today && 'is-today',
            key === selected && 'is-selected',
          ].filter(Boolean).join(' ');
          return (
            <button
              key={key}
              type="button"
              className={className}
              aria-pressed={key === selected}
              aria-label={`${d.getDate()} de ${monthName(d)}${list.length ? `, ${list.length} ${list.length === 1 ? 'evento' : 'eventos'}` : ''}`}
              onClick={() => onSelect(key === selected || !list.length ? null : key)}
            >
              <span className="calendar-num">{d.getDate()}</span>
              {list.slice(0, 2).map(e => <span key={e.id} className="calendar-event">{e.title}</span>)}
              {list.length > 2 && <span className="calendar-more">+{list.length - 2}</span>}
              {list.length > 0 && <span className="calendar-dot" aria-hidden="true"></span>}
            </button>
          );
        })}
      </div>
    </div>
  );
};

export default MonthCalendar;
