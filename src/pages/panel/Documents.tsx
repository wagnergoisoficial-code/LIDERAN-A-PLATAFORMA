import React, { useEffect, useState } from 'react';
import UIkit from 'uikit';
import { api } from '../../services/api';
import { useAuth } from '../../context/AuthContext';
import Icon from '../../components/Icon';
import Modal from '../../components/Modal';
import MoreMenu from '../../components/MoreMenu';
import PageHeader from '../../components/PageHeader';
import EmptyState from '../../components/EmptyState';

const notify = (message: string, status: 'success' | 'danger' = 'danger') => UIkit.notification({ message, status, pos: 'top-right' });

const KINDS: Record<string, string> = {
  ata: 'Ata',
  recomendacao: 'Carta de recomendação',
  transferencia: 'Carta de transferência',
  batismo: 'Certificado de batismo',
  ficha: 'Ficha de membro',
  outro: 'Outro',
};
const EMPTY = { kind: 'ata', title: '', date: '', memberId: '', notes: '' };
const dateOnly = (iso?: string | null) => (iso ? new Date(iso).toLocaleDateString('pt-BR', { timeZone: 'UTC' }) : '—');

interface ChurchDocument { id: string; kind: string; title: string; date?: string | null; memberId?: string | null; notes?: string | null; mimeType?: string | null; createdAt: string }

/** Secretaria: atas, cartas, certificados e fichas, com o arquivo guardado de forma privada. */
const Documents = () => {
  const { user } = useAuth();
  const [docs, setDocs] = useState<ChurchDocument[] | null>(null);
  const [members, setMembers] = useState<any[]>([]);
  const [filter, setFilter] = useState('');
  const [form, setForm] = useState<typeof EMPTY | null>(null);
  const [file, setFile] = useState<File | null>(null);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    api.getDocuments().then(res => setDocs(res.data || [])).catch(() => { setDocs([]); notify('Não foi possível carregar os documentos'); });
    api.getChurchMembers(user!.churchId!).then(res => setMembers(res.data || [])).catch(() => setMembers([]));
  }, [user]);

  const nameOf = (id?: string | null) => members.find(m => m.id === id)?.name || '—';
  const set = (key: keyof typeof EMPTY) => (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) =>
    setForm(f => f && { ...f, [key]: e.target.value });

  const save = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form) return;
    setSaving(true);
    const data = new FormData();
    Object.entries(form).forEach(([key, value]) => value && data.append(key, value));
    if (file) data.append('file', file);
    try {
      const res = await api.createDocument(data);
      setDocs(list => [res.data, ...(list || [])]);
      setForm(null);
      setFile(null);
      notify(res.message, 'success');
    } catch (err: any) {
      notify(err.message || 'Não foi possível guardar o documento');
    } finally {
      setSaving(false);
    }
  };

  // A janela abre já no clique (senão o navegador bloqueia-a) e recebe o arquivo quando chega
  const open = async (doc: ChurchDocument) => {
    const tab = window.open('', '_blank');
    try {
      const url = URL.createObjectURL(await api.getDocumentFile(doc.id));
      if (tab) tab.location.href = url;
      else window.location.assign(url);
      setTimeout(() => URL.revokeObjectURL(url), 60_000);
    } catch (err: any) {
      tab?.close();
      notify(err.message);
    }
  };

  const remove = async (doc: ChurchDocument) => {
    if (!confirm(`Apagar "${doc.title}"? O arquivo também será apagado.`)) return;
    try {
      await api.deleteDocument(doc.id);
      setDocs(list => (list || []).filter(d => d.id !== doc.id));
      notify('Documento apagado', 'success');
    } catch (err: any) {
      notify(err.message || 'Não foi possível apagar');
    }
  };

  const shown = (docs || []).filter(d => !filter || d.kind === filter);

  return (
    <div>
      <PageHeader title="Documentos" subtitle="Atas, cartas, certificados e fichas. Só a secretaria e a liderança têm acesso."
        actions={<button type="button" className="uk-button uk-button-primary" onClick={() => setForm({ ...EMPTY })}><Icon name="plus" size={18} /> Novo documento</button>} />

      <div className="section-head" style={{ marginBottom: '10px' }}>
        <h2 className="list-label">Arquivo{docs?.length ? ` · ${shown.length}` : ''}</h2>
        <select className="form-input" style={{ width: 'auto' }} aria-label="Filtrar por tipo" value={filter} onChange={e => setFilter(e.target.value)}>
          <option value="">Todos os tipos</option>
          {Object.entries(KINDS).map(([value, label]) => <option key={value} value={value}>{label}</option>)}
        </select>
      </div>

      {docs === null ? (
        <div className="card loading-block"><span uk-spinner="ratio: 0.8"></span></div>
      ) : shown.length === 0 ? (
        <div className="card"><EmptyState icon="file-text" title="Nenhum documento" text='Guarde aqui as atas das reuniões, as cartas e os certificados. Toque em "Novo documento".' /></div>
      ) : (
        <div className="card table-scroll">
          <table className="data-table">
            <thead>
              <tr>
                <th scope="col">Documento</th><th scope="col">Membro</th><th scope="col">Data</th>
                <th scope="col">Arquivo</th><th scope="col"><span className="visually-hidden">Ações</span></th>
              </tr>
            </thead>
            <tbody>
              {shown.map(doc => (
                <tr key={doc.id}>
                  <td style={{ minWidth: '200px' }}>
                    <strong>{doc.title}</strong>
                    <span className="list-row-meta" style={{ display: 'block' }}>{KINDS[doc.kind] || doc.kind}{doc.notes ? ` · ${doc.notes}` : ''}</span>
                  </td>
                  <td className="muted">{nameOf(doc.memberId)}</td>
                  <td className="muted" style={{ whiteSpace: 'nowrap' }}>{dateOnly(doc.date || doc.createdAt)}</td>
                  <td>
                    {doc.mimeType
                      ? <button type="button" className="uk-button uk-button-default uk-button-small" onClick={() => open(doc)}><Icon name="external" size={16} /> Abrir</button>
                      : <span className="muted">—</span>}
                  </td>
                  <td style={{ textAlign: 'right' }}>
                    <MoreMenu label={`Opções de ${doc.title}`} actions={[{ label: 'Apagar', icon: 'trash', danger: true, onSelect: () => remove(doc) }]} />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {form && (
        <Modal title="Novo documento" onClose={() => setForm(null)} width={560} onSubmit={save}>
          <div className="form-grid">
            <div>
              <label className="form-label" htmlFor="doc-kind">Tipo</label>
              <select id="doc-kind" className="form-input" value={form.kind} onChange={set('kind')} data-autofocus>
                {Object.entries(KINDS).map(([value, label]) => <option key={value} value={value}>{label}</option>)}
              </select>
            </div>
            <div>
              <label className="form-label" htmlFor="doc-date">Data <span className="faint" style={{ fontWeight: 400 }}>(opcional)</span></label>
              <input id="doc-date" className="form-input" type="date" value={form.date} onChange={set('date')} />
            </div>
            <div className="is-wide">
              <label className="form-label" htmlFor="doc-title">Título</label>
              <input id="doc-title" className="form-input" maxLength={120} required value={form.title} onChange={set('title')} placeholder="Ex.: Ata da reunião de novembro" />
            </div>
            <div className="is-wide">
              <label className="form-label" htmlFor="doc-member">Membro <span className="faint" style={{ fontWeight: 400 }}>(opcional)</span></label>
              <select id="doc-member" className="form-input" value={form.memberId} onChange={set('memberId')}>
                <option value="">Nenhum</option>
                {members.map(m => <option key={m.id} value={m.id}>{m.name}</option>)}
              </select>
            </div>
            <div className="is-wide">
              <label className="form-label" htmlFor="doc-notes">Observações <span className="faint" style={{ fontWeight: 400 }}>(opcional)</span></label>
              <textarea id="doc-notes" className="form-input" rows={3} maxLength={2000} value={form.notes} onChange={set('notes')} />
            </div>
            <div className="is-wide">
              <label className="form-label" htmlFor="doc-file">Arquivo <span className="faint" style={{ fontWeight: 400 }}>(PDF ou foto, opcional)</span></label>
              <input id="doc-file" className="form-input" type="file" accept="application/pdf,image/jpeg,image/png,image/webp"
                onChange={e => setFile(e.target.files?.[0] || null)} />
            </div>
          </div>
          <div className="form-btn-row">
            <button type="button" className="form-btn" onClick={() => setForm(null)}>Cancelar</button>
            <button type="submit" className="form-btn primary" disabled={saving}>{saving ? 'Guardando…' : 'Guardar documento'}</button>
          </div>
        </Modal>
      )}
    </div>
  );
};

export default Documents;
