import React, { useEffect, useState } from 'react';
import UIkit from 'uikit';
import { api } from '../../services/api';
import { useAuth } from '../../context/AuthContext';
import Avatar from '../../components/Avatar';
import Icon from '../../components/Icon';
import Modal from '../../components/Modal';
import MoreMenu from '../../components/MoreMenu';
import PageHeader from '../../components/PageHeader';
import EmptyState from '../../components/EmptyState';

const notify = (message: string, status: 'success' | 'danger' = 'danger') => UIkit.notification({ message, status, pos: 'top-right' });

interface RollCall { id: string; date: string; title: string; presentIds: string[] }
interface Draft { id?: string; date: string; title: string; present: string[] }

// A participação conta as últimas chamadas
const RECENT = 10;
const TITLES = ['Culto de jovens', 'Ensaio', 'Reunião', 'Encontro'];
const today = () => new Date().toLocaleDateString('en-CA');
// O dia da chamada não tem hora: lê-se em UTC para não mudar de dia
const dayOf = (iso: string, opts: Intl.DateTimeFormatOptions = { weekday: 'short', day: '2-digit', month: '2-digit', year: 'numeric' }) =>
  new Date(iso).toLocaleDateString('pt-BR', { timeZone: 'UTC', ...opts });
const byDate = (a: RollCall, b: RollCall) => b.date.localeCompare(a.date);

/** Secretaria: uma chamada por encontro e a participação de cada jovem. */
const Attendance = () => {
  const { user } = useAuth();
  const [calls, setCalls] = useState<RollCall[] | null>(null);
  const [members, setMembers] = useState<any[]>([]);
  const [events, setEvents] = useState<any[]>([]);
  const [draft, setDraft] = useState<Draft | null>(null);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    api.getRollCalls().then(res => setCalls(res.data || [])).catch(() => { setCalls([]); notify('Não foi possível carregar as chamadas'); });
    api.getChurchMembers(user!.churchId!)
      .then(res => setMembers((res.data || []).filter((m: any) => (m.status || 'active') === 'active').sort((a: any, b: any) => a.name.localeCompare(b.name, 'pt'))))
      .catch(() => setMembers([]));
    api.getEvents().then(res => setEvents(res.data || [])).catch(() => setEvents([]));
  }, [user]);

  // Encontros da agenda nesse dia sugerem o nome da chamada
  const suggestions = draft
    ? [...new Set([...events.filter(e => new Date(e.startDate).toLocaleDateString('en-CA') === draft.date).map(e => e.title), ...TITLES])]
    : [];

  const toggle = (id: string) => setDraft(d => d && { ...d, present: d.present.includes(id) ? d.present.filter(x => x !== id) : [...d.present, id] });

  const save = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!draft) return;
    setSaving(true);
    try {
      const res = await api.saveRollCall({ date: draft.date, title: draft.title, presentIds: draft.present }, draft.id);
      setCalls(list => [res.data, ...(list || []).filter(c => c.id !== res.data.id)].sort(byDate));
      setDraft(null);
      notify(res.message, 'success');
    } catch (err: any) {
      notify(err.message || 'Não foi possível guardar a chamada');
    } finally {
      setSaving(false);
    }
  };

  const remove = async (call: RollCall) => {
    if (!confirm(`Apagar a chamada "${call.title}" de ${dayOf(call.date)}?`)) return;
    try {
      await api.deleteRollCall(call.id);
      setCalls(list => (list || []).filter(c => c.id !== call.id));
      notify('Chamada apagada', 'success');
    } catch (err: any) {
      notify(err.message || 'Não foi possível apagar');
    }
  };

  // Quem faltou mais aparece primeiro, para a liderança acompanhar
  const recent = (calls || []).slice(0, RECENT);
  const participation = members.map(m => ({
    ...m,
    count: recent.filter(c => c.presentIds.includes(m.id)).length,
    last: (calls || []).find(c => c.presentIds.includes(m.id)),
  })).sort((a, b) => a.count - b.count || a.name.localeCompare(b.name, 'pt'));

  return (
    <div>
      <PageHeader title="Controle de presença" subtitle="Acompanhar a participação: uma chamada por encontro."
        actions={<button type="button" className="uk-button uk-button-primary" onClick={() => setDraft({ date: today(), title: TITLES[0], present: [] })}>
          <Icon name="plus" size={18} /> Nova chamada
        </button>} />

      {calls === null ? (
        <div className="card loading-block"><span uk-spinner="ratio: 0.8"></span></div>
      ) : calls.length === 0 ? (
        <div className="card"><EmptyState icon="list" title="Ainda não há chamadas" text='Em cada culto ou encontro, toque em "Nova chamada" e marque quem veio.' /></div>
      ) : (
        <div className="panel-split">
          <section aria-labelledby="calls-title">
            <h2 id="calls-title" className="list-label">Chamadas · {calls.length}</h2>
            <div className="card table-scroll">
              <table className="data-table">
                <thead>
                  <tr><th scope="col">Data</th><th scope="col">Encontro</th><th scope="col">Presentes</th><th scope="col"><span className="visually-hidden">Ações</span></th></tr>
                </thead>
                <tbody>
                  {calls.map(call => (
                    <tr key={call.id}>
                      <td className="muted" style={{ whiteSpace: 'nowrap' }}>{dayOf(call.date)}</td>
                      <td style={{ minWidth: '160px' }}><strong>{call.title}</strong></td>
                      <td style={{ whiteSpace: 'nowrap' }}>
                        {call.presentIds.length}{members.length ? <span className="muted"> de {members.length}</span> : null}
                      </td>
                      <td style={{ textAlign: 'right' }}>
                        <MoreMenu label={`Opções da chamada ${call.title}`} actions={[
                          { label: 'Corrigir', icon: 'pencil', onSelect: () => setDraft({ id: call.id, date: call.date.slice(0, 10), title: call.title, present: call.presentIds }) },
                          { label: 'Apagar', icon: 'trash', danger: true, onSelect: () => remove(call) },
                        ]} />
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </section>

          <section aria-labelledby="participation-title">
            <h2 id="participation-title" className="list-label">Participação nas últimas {Math.min(RECENT, calls.length)} chamadas</h2>
            <div className="card">
              {participation.map(m => (
                <div key={m.id} className="list-row">
                  <Avatar name={m.name} profileImage={m.profileImage} size={36} />
                  <span style={{ flex: 1, minWidth: 0 }}>
                    <span className="list-row-title"><span className="truncate">{m.name}</span></span>
                    <span className="list-row-meta" style={{ display: 'block' }}>
                      {m.last ? `Última presença: ${dayOf(m.last.date, { day: '2-digit', month: '2-digit' })}` : 'Ainda sem presenças'}
                    </span>
                    <span className="meter" style={{ display: 'block', marginTop: '6px' }} aria-hidden="true">
                      <span style={{ display: 'block', height: '100%', width: `${(m.count / recent.length) * 100}%`, background: 'var(--accent)' }} />
                    </span>
                  </span>
                  <span style={{ flex: 'none', fontVariantNumeric: 'tabular-nums' }}>{m.count} de {recent.length}</span>
                </div>
              ))}
            </div>
          </section>
        </div>
      )}

      {draft && (
        <Modal title={draft.id ? 'Corrigir chamada' : 'Nova chamada'} onClose={() => setDraft(null)} width={680} onSubmit={save}>
          <div className="form-grid">
            <div>
              <label className="form-label" htmlFor="roll-date">Data</label>
              <input id="roll-date" className="form-input" type="date" required max={today()} value={draft.date}
                onChange={e => setDraft({ ...draft, date: e.target.value })} />
            </div>
            <div>
              <label className="form-label" htmlFor="roll-title">Encontro</label>
              <input id="roll-title" className="form-input" list="roll-titles" required maxLength={80} value={draft.title}
                onChange={e => setDraft({ ...draft, title: e.target.value })} />
              <datalist id="roll-titles">{suggestions.map(t => <option key={t} value={t} />)}</datalist>
            </div>
          </div>

          <div className="section-head" style={{ marginTop: '18px' }}>
            <span className="list-label">Presentes · {draft.present.length} de {members.length}</span>
            <span style={{ display: 'flex', gap: '14px' }}>
              <button type="button" className="link-btn" onClick={() => setDraft({ ...draft, present: members.map(m => m.id) })}>Todos</button>
              <button type="button" className="link-btn" onClick={() => setDraft({ ...draft, present: [] })}>Nenhum</button>
            </span>
          </div>
          <div className="roll-list">
            {members.map(m => {
              const on = draft.present.includes(m.id);
              return (
                <label key={m.id} className={`roll-item${on ? ' is-on' : ''}`}>
                  <input type="checkbox" checked={on} onChange={() => toggle(m.id)} />
                  <Avatar name={m.name} profileImage={m.profileImage} size={32} />
                  <span className="truncate">{m.name}</span>
                </label>
              );
            })}
          </div>

          <div className="form-btn-row">
            <button type="button" className="form-btn" onClick={() => setDraft(null)}>Cancelar</button>
            <button type="submit" className="form-btn primary" disabled={saving}>{saving ? 'Guardando…' : 'Guardar chamada'}</button>
          </div>
        </Modal>
      )}
    </div>
  );
};

export default Attendance;
