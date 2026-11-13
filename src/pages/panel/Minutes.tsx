import React, { useEffect, useState } from 'react';
import UIkit from 'uikit';
import { api } from '../../services/api';
import Icon from '../../components/Icon';
import Modal from '../../components/Modal';
import MoreMenu from '../../components/MoreMenu';
import PageHeader from '../../components/PageHeader';
import EmptyState from '../../components/EmptyState';

const notify = (message: string, status: 'success' | 'danger' = 'danger') => UIkit.notification({ message, status, pos: 'top-right' });

// Documentos guardados antes do livro de atas continuam acessíveis
const OTHER_KINDS: Record<string, string> = {
  recomendacao: 'Carta de recomendação', transferencia: 'Carta de transferência',
  batismo: 'Certificado de batismo', ficha: 'Ficha de membro', outro: 'Outro',
};
const EMPTY = { title: '', date: '', notes: '' };
const today = () => new Date().toLocaleDateString('en-CA');
const dateOnly = (iso?: string | null) => (iso ? new Date(iso).toLocaleDateString('pt-BR', { timeZone: 'UTC' }) : '—');
const at = (d: Doc) => new Date(d.date || d.createdAt).getTime();

interface Doc { id: string; kind: string; title: string; date?: string | null; notes?: string | null; mimeType?: string | null; createdAt: string }

/** Secretaria: o livro de atas — reuniões e decisões, com a ata assinada em anexo se houver. */
const Minutes = () => {
  const [docs, setDocs] = useState<Doc[] | null>(null);
  const [form, setForm] = useState<typeof EMPTY | null>(null);
  const [file, setFile] = useState<File | null>(null);
  const [reading, setReading] = useState<Doc | null>(null);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    api.getDocuments().then(res => setDocs(res.data || [])).catch(() => { setDocs([]); notify('Não foi possível carregar as atas'); });
  }, []);

  const save = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form) return;
    setSaving(true);
    const data = new FormData();
    data.append('kind', 'ata');
    Object.entries(form).forEach(([key, value]) => value && data.append(key, value));
    if (file) data.append('file', file);
    try {
      const res = await api.createDocument(data);
      setDocs(list => [res.data, ...(list || [])]);
      setForm(null);
      setFile(null);
      notify('Ata registrada', 'success');
    } catch (err: any) {
      notify(err.message || 'Não foi possível guardar a ata');
    } finally {
      setSaving(false);
    }
  };

  // A janela abre já no clique (senão o navegador bloqueia-a) e recebe o arquivo quando chega
  const open = async (doc: Doc) => {
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

  const remove = async (doc: Doc) => {
    if (!confirm(`Apagar "${doc.title}"? O anexo também será apagado.`)) return;
    try {
      await api.deleteDocument(doc.id);
      setDocs(list => (list || []).filter(d => d.id !== doc.id));
      setReading(null);
      notify('Apagado', 'success');
    } catch (err: any) {
      notify(err.message || 'Não foi possível apagar');
    }
  };

  const atas = (docs || []).filter(d => d.kind === 'ata').sort((a, b) => at(b) - at(a));
  const others = (docs || []).filter(d => d.kind !== 'ata');

  const row = (doc: Doc, label?: string) => (
    <div key={doc.id} className="list-row ata-row">
      <span className="ata-date">{dateOnly(doc.date || doc.createdAt)}</span>
      <button type="button" className="ata-body" onClick={() => setReading(doc)}>
        <span className="list-row-title"><span className="truncate">{doc.title}</span></span>
        <span className="ata-excerpt">{label || doc.notes || (doc.mimeType ? 'Ata em anexo' : '')}</span>
      </button>
      {doc.mimeType && (
        <button type="button" className="action-btn" aria-label={`Abrir o anexo de ${doc.title}`} title="Abrir o anexo" onClick={() => open(doc)}>
          <Icon name="file-text" />
        </button>
      )}
      <MoreMenu label={`Opções de ${doc.title}`} actions={[
        { label: 'Ler', icon: 'book', onSelect: () => setReading(doc) },
        { label: 'Apagar', icon: 'trash', danger: true, onSelect: () => remove(doc) },
      ]} />
    </div>
  );

  return (
    <div>
      <PageHeader title="Livro de atas" subtitle="Registrar reuniões e decisões. Só a secretaria e a liderança têm acesso."
        actions={<button type="button" className="uk-button uk-button-primary" onClick={() => setForm({ ...EMPTY, date: today() })}><Icon name="plus" size={18} /> Nova ata</button>} />

      {docs === null ? (
        <div className="card loading-block"><span uk-spinner="ratio: 0.8"></span></div>
      ) : atas.length === 0 ? (
        <div className="card"><EmptyState icon="file-text" title="Nenhuma ata registrada" text="Depois de cada reunião, registre aqui o que foi tratado e decidido." /></div>
      ) : (
        <>
          <h2 className="list-label">Atas · {atas.length}</h2>
          <div className="card">{atas.map(doc => row(doc))}</div>
        </>
      )}

      {others.length > 0 && (
        <section className="section" aria-labelledby="outros-title">
          <h2 id="outros-title" className="list-label">Outros documentos · {others.length}</h2>
          <div className="card">{others.map(doc => row(doc, OTHER_KINDS[doc.kind] || doc.kind))}</div>
        </section>
      )}

      {form && (
        <Modal title="Nova ata" onClose={() => setForm(null)} width={680} onSubmit={save}>
          <div className="form-grid">
            <div>
              <label className="form-label" htmlFor="ata-date">Data da reunião</label>
              <input id="ata-date" className="form-input" type="date" required max={today()} value={form.date} onChange={e => setForm({ ...form, date: e.target.value })} />
            </div>
            <div>
              <label className="form-label" htmlFor="ata-title">Assunto</label>
              <input id="ata-title" className="form-input" required maxLength={120} placeholder="Ex.: Reunião da mocidade" value={form.title}
                onChange={e => setForm({ ...form, title: e.target.value })} data-autofocus />
            </div>
            <div className="is-wide">
              <label className="form-label" htmlFor="ata-text">Texto da ata</label>
              <textarea id="ata-text" className="form-input" rows={12} maxLength={20000} placeholder="Presentes, assuntos tratados e decisões tomadas."
                value={form.notes} onChange={e => setForm({ ...form, notes: e.target.value })} />
            </div>
            <div className="is-wide">
              <label className="form-label" htmlFor="ata-file">Ata assinada <span className="faint" style={{ fontWeight: 400 }}>(PDF ou foto, opcional)</span></label>
              <input id="ata-file" className="form-input" type="file" accept="application/pdf,image/jpeg,image/png,image/webp" onChange={e => setFile(e.target.files?.[0] || null)} />
            </div>
          </div>
          <div className="form-btn-row">
            <button type="button" className="form-btn" onClick={() => setForm(null)}>Cancelar</button>
            <button type="submit" className="form-btn primary" disabled={saving}>{saving ? 'Guardando…' : 'Registrar ata'}</button>
          </div>
        </Modal>
      )}

      {reading && (
        <Modal title={reading.title} onClose={() => setReading(null)} width={720}>
          <p className="faint" style={{ marginTop: 0 }}>{OTHER_KINDS[reading.kind] || 'Ata'} · {dateOnly(reading.date || reading.createdAt)}</p>
          <div className="ata-text">{reading.notes || 'Sem texto: veja o anexo.'}</div>
          <div className="form-btn-row">
            {reading.mimeType && <button type="button" className="form-btn" onClick={() => open(reading)}>Abrir o anexo</button>}
            <button type="button" className="form-btn primary" onClick={() => setReading(null)}>Fechar</button>
          </div>
        </Modal>
      )}
    </div>
  );
};

export default Minutes;
