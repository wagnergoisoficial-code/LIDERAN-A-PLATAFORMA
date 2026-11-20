import React, { useState } from 'react';
import UIkit from 'uikit';
import { api } from '../services/api';
import Modal from './Modal';

export interface EventDraft { title: string; description: string; location: string; startDate: string; endDate: string }

export const EMPTY_EVENT: EventDraft = { title: '', description: '', location: '', startDate: '', endDate: '' };

// Valor para <input type="datetime-local"> no fuso do navegador
export const toLocalInput = (d?: string | null) => {
  if (!d) return '';
  const date = new Date(d);
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(date.getHours())}:${pad(date.getMinutes())}`;
};

// Datas em ISO: o servidor recebe o instante exato, independente do fuso
export const eventPayload = (form: EventDraft) => ({
  ...form,
  startDate: form.startDate ? new Date(form.startDate).toISOString() : '',
  endDate: form.endDate ? new Date(form.endDate).toISOString() : null,
});

/** Campos de um encontro (título, descrição, local, início e fim). */
export const EventFields: React.FC<{ value: EventDraft; onChange: (patch: Partial<EventDraft>) => void; autoFocus?: boolean }> = ({ value, onChange, autoFocus }) => (
  <div className="form-stack">
    <div>
      <label className="form-label" htmlFor="event-title">Título</label>
      <input id="event-title" className="form-input" type="text" placeholder="Ex.: Ensaio geral" maxLength={120} required
        {...(autoFocus ? { 'data-autofocus': true } : {})} value={value.title} onChange={e => onChange({ title: e.target.value })} />
    </div>
    <div className="form-grid">
      <div>
        <label className="form-label" htmlFor="event-start">Início</label>
        <input id="event-start" className="form-input" type="datetime-local" required value={value.startDate} onChange={e => onChange({ startDate: e.target.value })} />
      </div>
      <div>
        <label className="form-label" htmlFor="event-end">Fim <span className="faint" style={{ fontWeight: 400 }}>(opcional)</span></label>
        <input id="event-end" className="form-input" type="datetime-local" value={value.endDate} onChange={e => onChange({ endDate: e.target.value })} />
      </div>
    </div>
    <div>
      <label className="form-label" htmlFor="event-location">Local <span className="faint" style={{ fontWeight: 400 }}>(opcional)</span></label>
      <input id="event-location" className="form-input" type="text" placeholder="Endereço ou sala" value={value.location} onChange={e => onChange({ location: e.target.value })} />
    </div>
    <div>
      <label className="form-label" htmlFor="event-description">Descrição <span className="faint" style={{ fontWeight: 400 }}>(opcional)</span></label>
      <textarea id="event-description" className="form-input" rows={3} placeholder="O que vai acontecer e o que levar" value={value.description}
        onChange={e => onChange({ description: e.target.value })} />
    </div>
  </div>
);

interface EventFormModalProps {
  event?: { id: string; title: string; description?: string | null; location?: string | null; startDate: string; endDate?: string | null };
  onClose: () => void;
  onSaved: (event: any) => void;
}

/** Criar ou editar um encontro num diálogo (Agenda e feed). */
export const EventFormModal: React.FC<EventFormModalProps> = ({ event, onClose, onSaved }) => {
  const [form, setForm] = useState<EventDraft>(() => event ? {
    title: event.title,
    description: event.description || '',
    location: event.location || '',
    startDate: toLocalInput(event.startDate),
    endDate: toLocalInput(event.endDate),
  } : EMPTY_EVENT);
  const [saving, setSaving] = useState(false);

  const save = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    try {
      const res = event ? await api.updateEvent(event.id, eventPayload(form)) : await api.createEvent(eventPayload(form));
      UIkit.notification({ message: event ? 'Encontro atualizado' : 'Encontro criado', status: 'success', pos: 'top-right' });
      onSaved(res.data);
    } catch (err: any) {
      UIkit.notification({ message: err.message || 'Não foi possível salvar o encontro', status: 'danger', pos: 'top-right' });
    } finally {
      setSaving(false);
    }
  };

  return (
    <Modal title={event ? 'Editar encontro' : 'Novo encontro'} onClose={onClose} width={520} onSubmit={save}>
      <EventFields value={form} onChange={patch => setForm(f => ({ ...f, ...patch }))} autoFocus />
      <div className="form-btn-row">
        <button type="button" className="form-btn" onClick={onClose}>Cancelar</button>
        <button type="submit" className="form-btn primary" disabled={saving}>
          {saving ? <><span uk-spinner="ratio: 0.5"></span> Salvando…</> : event ? 'Salvar' : 'Criar encontro'}
        </button>
      </div>
    </Modal>
  );
};
