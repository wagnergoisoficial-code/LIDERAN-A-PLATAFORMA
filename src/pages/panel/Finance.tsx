import React, { useCallback, useEffect, useState } from 'react';
import UIkit from 'uikit';
import { api } from '../../services/api';
import { useAuth } from '../../context/AuthContext';
import Icon from '../../components/Icon';
import Modal from '../../components/Modal';
import MoreMenu from '../../components/MoreMenu';
import PageHeader from '../../components/PageHeader';
import EmptyState from '../../components/EmptyState';

const notify = (message: string, status: 'success' | 'danger' = 'danger') => UIkit.notification({ message, status, pos: 'top-right' });

const CATEGORIES = ['Dízimo', 'Oferta', 'Contribuição', 'Evento', 'Material', 'Transporte', 'Alimentação', 'Outro'];
const money = (cents: number) => (cents / 100).toLocaleString('pt-MZ', { style: 'currency', currency: 'MZN' });
// As datas dos lançamentos são dias (sem hora): lêem-se em UTC para não mudarem de dia
const dateOnly = (iso: string) => new Date(iso).toLocaleDateString('pt-BR', { timeZone: 'UTC' });
const thisMonth = () => new Date().toISOString().slice(0, 7);
const today = () => new Date().toLocaleDateString('en-CA');

interface Entry { id: string; kind: 'entrada' | 'saida'; category: string; amountCents: number; date: string; description?: string | null; memberId?: string | null; createdById: string }

const EMPTY = { kind: 'entrada', category: 'Dízimo', amount: '', date: '', memberId: '', description: '' };

/** Tesouraria: lançamentos do mês, saldo e exportação. Os jovens não veem nada disto. */
const Finance = () => {
  const { user } = useAuth();
  const [month, setMonth] = useState(thisMonth);
  const [data, setData] = useState<{ entries: Entry[]; balanceCents: number } | null>(null);
  const [members, setMembers] = useState<any[]>([]);
  const [form, setForm] = useState<typeof EMPTY | null>(null);
  const [saving, setSaving] = useState(false);

  const load = useCallback(() => {
    api.getFinance(month).then(res => setData(res.data)).catch((err: any) => { setData({ entries: [], balanceCents: 0 }); notify(err.message || 'Não foi possível carregar os lançamentos'); });
  }, [month]);

  useEffect(() => { load(); }, [load]);
  useEffect(() => {
    api.getChurchMembers(user!.churchId!).then(res => setMembers(res.data || [])).catch(() => setMembers([]));
  }, [user]);

  const nameOf = (id?: string | null) => (id ? members.find(m => m.id === id)?.name || 'Ex-membro' : '');
  const set = (key: keyof typeof EMPTY) => (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) =>
    setForm(f => f && { ...f, [key]: e.target.value });

  const entries = data?.entries || [];
  const sum = (kind: string) => entries.filter(e => e.kind === kind).reduce((total, e) => total + e.amountCents, 0);
  const income = sum('entrada');
  const expense = sum('saida');

  const save = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form) return;
    setSaving(true);
    try {
      const res = await api.createFinance({ ...form, memberId: form.memberId || null });
      setForm(null);
      notify(res.message, 'success');
      load();
    } catch (err: any) {
      notify(err.message || 'Não foi possível registrar');
    } finally {
      setSaving(false);
    }
  };

  const remove = async (entry: Entry) => {
    if (!confirm(`Apagar o lançamento "${entry.category}" de ${money(entry.amountCents)}?`)) return;
    try {
      await api.deleteFinance(entry.id);
      notify('Lançamento apagado', 'success');
      load();
    } catch (err: any) {
      notify(err.message || 'Não foi possível apagar');
    }
  };

  // CSV com ";" e BOM, para abrir certo no Excel em português
  const exportCsv = () => {
    const cell = (value: string) => `"${value.replace(/"/g, '""')}"`;
    const rows = [['Data', 'Tipo', 'Categoria', 'Descrição', 'Membro', 'Valor'],
      ...entries.map(e => [dateOnly(e.date), e.kind === 'entrada' ? 'Entrada' : 'Saída', e.category, e.description || '', nameOf(e.memberId),
        ((e.kind === 'saida' ? -e.amountCents : e.amountCents) / 100).toFixed(2).replace('.', ',')])];
    const blob = new Blob(['﻿' + rows.map(r => r.map(cell).join(';')).join('\r\n')], { type: 'text/csv;charset=utf-8' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = `tesouraria-${month}.csv`;
    link.click();
    setTimeout(() => URL.revokeObjectURL(link.href), 10_000);
  };

  return (
    <div>
      <PageHeader title="Tesouraria" subtitle="Entradas e saídas da comunidade. Só a tesouraria e a liderança têm acesso."
        actions={<button type="button" className="uk-button uk-button-primary" onClick={() => setForm({ ...EMPTY, date: today() })}><Icon name="plus" size={18} /> Novo lançamento</button>} />

      <div className="card stat-grid" style={{ marginBottom: '24px' }}>
        <div className="stat"><div className="stat-label">Saldo atual</div><div className="stat-value">{data ? money(data.balanceCents) : '—'}</div><div className="stat-sub">Todos os lançamentos</div></div>
        <div className="stat"><div className="stat-label">Entradas no mês</div><div className="stat-value">{money(income)}</div></div>
        <div className="stat"><div className="stat-label">Saídas no mês</div><div className="stat-value">{money(expense)}</div><div className="stat-sub">Resultado: {money(income - expense)}</div></div>
      </div>

      <div className="section-head" style={{ marginBottom: '10px' }}>
        <h2 className="list-label">Lançamentos{entries.length ? ` · ${entries.length}` : ''}</h2>
        <span style={{ display: 'flex', flexWrap: 'wrap', gap: '8px', alignItems: 'center' }}>
          <input className="form-input" type="month" aria-label="Mês" value={month} max={thisMonth()} onChange={e => e.target.value && setMonth(e.target.value)} style={{ width: 'auto' }} />
          <button type="button" className="uk-button uk-button-default" onClick={exportCsv} disabled={!entries.length}><Icon name="download" size={16} /> Exportar CSV</button>
        </span>
      </div>

      {data === null ? (
        <div className="card loading-block"><span uk-spinner="ratio: 0.8"></span></div>
      ) : entries.length === 0 ? (
        <div className="card"><EmptyState icon="wallet" title="Nenhum lançamento neste mês" text='Registre dízimos, ofertas e despesas em "Novo lançamento".' /></div>
      ) : (
        <div className="card table-scroll">
          <table className="data-table">
            <thead>
              <tr>
                <th scope="col">Data</th><th scope="col">Lançamento</th><th scope="col">Membro</th>
                <th scope="col" style={{ textAlign: 'right' }}>Valor</th><th scope="col"><span className="visually-hidden">Ações</span></th>
              </tr>
            </thead>
            <tbody>
              {entries.map(entry => (
                <tr key={entry.id}>
                  <td className="muted" style={{ whiteSpace: 'nowrap' }}>{dateOnly(entry.date)}</td>
                  <td style={{ minWidth: '180px' }}>
                    <strong>{entry.category}</strong>
                    {entry.description && <span className="list-row-meta" style={{ display: 'block' }}>{entry.description}</span>}
                  </td>
                  <td className="muted">{nameOf(entry.memberId) || '—'}</td>
                  <td style={{ textAlign: 'right', whiteSpace: 'nowrap', fontWeight: 600, color: entry.kind === 'entrada' ? 'var(--success)' : 'var(--danger)' }}>
                    {entry.kind === 'entrada' ? '+' : '−'} {money(entry.amountCents)}
                  </td>
                  <td style={{ textAlign: 'right' }}>
                    <MoreMenu label={`Opções do lançamento ${entry.category}`} actions={[{ label: 'Apagar', icon: 'trash', danger: true, onSelect: () => remove(entry) }]} />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {form && (
        <Modal title="Novo lançamento" onClose={() => setForm(null)} width={560} onSubmit={save}>
          <div className="form-grid">
            <div className="is-wide">
              <span className="form-label" id="fin-kind">Tipo</span>
              <div className="guardian-mode" role="radiogroup" aria-labelledby="fin-kind">
                {[['entrada', 'Entrada'], ['saida', 'Saída']].map(([value, label]) => (
                  <label key={value} className={form.kind === value ? 'is-selected' : ''}>
                    <input type="radio" name="fin-kind" value={value} checked={form.kind === value} onChange={set('kind')} /> {label}
                  </label>
                ))}
              </div>
            </div>
            <div>
              <label className="form-label" htmlFor="fin-category">Categoria</label>
              <input id="fin-category" className="form-input" list="fin-categories" maxLength={60} required value={form.category} onChange={set('category')} data-autofocus />
              <datalist id="fin-categories">{CATEGORIES.map(c => <option key={c} value={c} />)}</datalist>
            </div>
            <div>
              <label className="form-label" htmlFor="fin-amount">Valor (MT)</label>
              <input id="fin-amount" className="form-input" type="number" inputMode="decimal" min="0.01" step="0.01" required value={form.amount} onChange={set('amount')} />
            </div>
            <div>
              <label className="form-label" htmlFor="fin-date">Data</label>
              <input id="fin-date" className="form-input" type="date" required value={form.date} onChange={set('date')} />
            </div>
            <div>
              <label className="form-label" htmlFor="fin-member">Membro <span className="faint" style={{ fontWeight: 400 }}>(opcional)</span></label>
              <select id="fin-member" className="form-input" value={form.memberId} onChange={set('memberId')}>
                <option value="">Nenhum</option>
                {members.map(m => <option key={m.id} value={m.id}>{m.name}</option>)}
              </select>
            </div>
            <div className="is-wide">
              <label className="form-label" htmlFor="fin-description">Descrição <span className="faint" style={{ fontWeight: 400 }}>(opcional)</span></label>
              <input id="fin-description" className="form-input" maxLength={300} value={form.description} onChange={set('description')} placeholder="Ex.: Oferta do culto de jovens" />
            </div>
          </div>
          <div className="form-btn-row">
            <button type="button" className="form-btn" onClick={() => setForm(null)}>Cancelar</button>
            <button type="submit" className="form-btn primary" disabled={saving}>{saving ? 'Registrando…' : 'Registrar'}</button>
          </div>
        </Modal>
      )}
    </div>
  );
};

export default Finance;
