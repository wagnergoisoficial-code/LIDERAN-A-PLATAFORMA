import React, { useState, useEffect, useCallback } from 'react';
import { api } from '../services/api';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';
import Avatar from '../components/Avatar';
import { SkeletonCard } from '../components/Skeleton';
import PageHeader from '../components/PageHeader';
import EmptyState from '../components/EmptyState';

interface Sermon {
  id: string;
  title: string;
  speaker: string;
  content: string;
  scriptureRef?: string;
  date: string;
  author: { id: string; name: string; profileImage?: string };
}

const Sermons: React.FC = () => {
  const { user } = useAuth();
  const { toast } = useToast();
  const [sermons, setSermons] = useState<Sermon[]>([]);
  const [loading, setLoading] = useState(true);
  const [selected, setSelected] = useState<Sermon | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [editing, setEditing] = useState<Sermon | null>(null);
  const [form, setForm] = useState({ title: '', speaker: '', content: '', scriptureRef: '', date: '' });
  const [saving, setSaving] = useState(false);

  const isLeader = user?.role === 'leader' || user?.role === 'admin';

  const load = useCallback(async () => {
    try {
      const res = await api.getSermons();
      if (res.success) setSermons(res.data || []);
    } catch { toast('Erro ao carregar pregações', 'error'); }
    finally { setLoading(false); }
  }, []);

  useEffect(() => { load(); }, [load]);

  const openCreate = () => {
    setEditing(null);
    setForm({ title: '', speaker: user?.name || '', content: '', scriptureRef: '', date: new Date().toISOString().slice(0, 10) });
    setShowForm(true);
  };

  const openEdit = (s: Sermon) => {
    setEditing(s);
    setForm({ title: s.title, speaker: s.speaker, content: s.content, scriptureRef: s.scriptureRef || '', date: s.date.slice(0, 10) });
    setShowForm(true);
    setSelected(null);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.title.trim() || !form.speaker.trim() || !form.content.trim()) return;
    setSaving(true);
    try {
      if (editing) {
        const res = await api.updateSermon(editing.id, form);
        if (res.success) {
          setSermons(prev => prev.map(s => s.id === editing.id ? res.data : s));
          toast('Pregação atualizada', 'success');
        }
      } else {
        const res = await api.createSermon(form);
        if (res.success) {
          setSermons(prev => [res.data, ...prev]);
          toast('Pregação publicada', 'success');
        }
      }
      setShowForm(false);
    } catch { toast('Erro ao salvar', 'error'); }
    finally { setSaving(false); }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Excluir esta pregação?')) return;
    try {
      await api.deleteSermon(id);
      setSermons(prev => prev.filter(s => s.id !== id));
      if (selected?.id === id) setSelected(null);
      toast('Pregação excluída', 'success');
    } catch { toast('Erro ao excluir', 'error'); }
  };

  return (
    <div>
        <PageHeader
          icon="bookmark"
          title="Pregações"
          subtitle="Notas e estudos bíblicos da comunidade"
          actions={isLeader && (
            <button onClick={openCreate} className="uk-button uk-button-primary">
              <span uk-icon="icon: plus; ratio: 0.8"></span> Nova Pregação
            </button>
          )}
        />

        {/* Detail view */}
        {selected ? (
          <div className="fade-in">
            <button onClick={() => setSelected(null)} style={{ display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '20px', background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-muted)', fontSize: '13px', padding: 0 }}>
              <span uk-icon="icon: arrow-left; ratio: 0.8"></span> Voltar
            </button>
            <div className="card" style={{ padding: '28px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '16px' }}>
                <div>
                  <h2 style={{ margin: '0 0 6px', fontSize: '20px', fontWeight: 700, color: 'var(--text)' }}>{selected.title}</h2>
                  <div style={{ display: 'flex', gap: '16px', flexWrap: 'wrap' }}>
                    <span style={{ fontSize: '13px', color: 'var(--text-muted)', display: 'flex', alignItems: 'center', gap: '4px' }}>
                      <span uk-icon="icon: user; ratio: 0.75"></span> {selected.speaker}
                    </span>
                    {selected.scriptureRef && (
                      <span style={{ fontSize: '13px', color: 'var(--text)', fontWeight: 500, display: 'flex', alignItems: 'center', gap: '4px' }}>
                        <span uk-icon="icon: file-text; ratio: 0.75"></span> {selected.scriptureRef}
                      </span>
                    )}
                    <span style={{ fontSize: '13px', color: 'var(--text-faint)', display: 'flex', alignItems: 'center', gap: '4px' }}>
                      <span uk-icon="icon: calendar; ratio: 0.75"></span>
                      {new Date(selected.date).toLocaleDateString('pt-BR', { day: '2-digit', month: 'long', year: 'numeric' })}
                    </span>
                  </div>
                </div>
                {isLeader && (
                  <div style={{ display: 'flex', gap: '8px' }}>
                    <button onClick={() => openEdit(selected)} className="uk-button uk-button-default uk-button-small">
                      <span uk-icon="icon: pencil; ratio: 0.75"></span> Editar
                    </button>
                    <button onClick={() => handleDelete(selected.id)} className="uk-button uk-button-danger uk-button-small">
                      <span uk-icon="icon: trash; ratio: 0.75"></span> Excluir
                    </button>
                  </div>
                )}
              </div>
              <hr style={{ border: 'none', borderTop: '1px solid var(--border)', margin: '16px 0' }} />
              <div style={{ fontSize: '14px', color: 'var(--text)', lineHeight: 1.8, whiteSpace: 'pre-wrap' }}>{selected.content}</div>
              <div style={{ marginTop: '20px', paddingTop: '16px', borderTop: '1px solid var(--border)', display: 'flex', alignItems: 'center', gap: '8px' }}>
                <Avatar name={selected.author.name} profileImage={selected.author.profileImage} size="small" />
                <span style={{ fontSize: '12px', color: 'var(--text-faint)' }}>por <strong style={{ color: 'var(--text-muted)' }}>{selected.author.name}</strong></span>
              </div>
            </div>
          </div>
        ) : (
          <>
            {loading ? (
              <>{Array.from({length: 3}).map((_, i) => <SkeletonCard key={i} />)}</>
            ) : sermons.length === 0 ? (
              <EmptyState icon="bookmark" title="Nenhuma pregação publicada ainda" text={isLeader ? 'Clique em "Nova Pregação" para começar' : undefined} />
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                {sermons.map((s, i) => (
                  <div
                    key={s.id}
                    className="card fade-in-up"
                    style={{ animationDelay: `${i * 40}ms`, padding: '16px 20px', cursor: 'pointer', transition: 'background var(--t), border-color var(--t)' }}
                    onClick={() => setSelected(s)}
                    onMouseEnter={e => (e.currentTarget.style.background = 'var(--bg-surface)')}
                    onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}
                  >
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                      <div style={{ flex: 1 }}>
                        <div style={{ fontWeight: 600, fontSize: '14px', color: 'var(--text)', marginBottom: '4px' }}>{s.title}</div>
                        <div style={{ display: 'flex', gap: '14px', flexWrap: 'wrap' }}>
                          <span style={{ fontSize: '12px', color: 'var(--text-muted)' }}>{s.speaker}</span>
                          {s.scriptureRef && <span style={{ fontSize: '12px', color: 'var(--text)', fontWeight: 500 }}>{s.scriptureRef}</span>}
                          <span style={{ fontSize: '12px', color: 'var(--text-faint)' }}>
                            {new Date(s.date).toLocaleDateString('pt-BR', { day: '2-digit', month: 'short', year: 'numeric' })}
                          </span>
                        </div>
                        <div style={{ fontSize: '12px', color: 'var(--text-faint)', marginTop: '6px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', maxWidth: '600px' }}>
                          {s.content}
                        </div>
                      </div>
                      <span uk-icon="icon: chevron-right; ratio: 0.85" style={{ color: 'var(--border-strong)', flexShrink: 0, marginLeft: '12px' }}></span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </>
        )}

        {/* Form Modal */}
        {showForm && (
          <div className="modal-overlay" onClick={e => { if (e.target === e.currentTarget) setShowForm(false); }}>
            <div className="modal-box fade-in" style={{ maxWidth: '600px' }}>
              <div className="modal-header">
                <h4>{editing ? 'Editar Pregação' : 'Nova Pregação'}</h4>
                <button className="modal-close-btn" onClick={() => setShowForm(false)}>
                  <span uk-icon="icon: close; ratio: 0.9"></span>
                </button>
              </div>
              <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
                <div>
                  <label className="uk-form-label">Título *</label>
                  <input className="uk-input" value={form.title} onChange={e => setForm(f => ({...f, title: e.target.value}))} placeholder="Título da pregação" required />
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                  <div>
                    <label className="uk-form-label">Pregador *</label>
                    <input className="uk-input" value={form.speaker} onChange={e => setForm(f => ({...f, speaker: e.target.value}))} placeholder="Nome do pregador" required />
                  </div>
                  <div>
                    <label className="uk-form-label">Data</label>
                    <input className="uk-input" type="date" value={form.date} onChange={e => setForm(f => ({...f, date: e.target.value}))} />
                  </div>
                </div>
                <div>
                  <label className="uk-form-label">Referência bíblica</label>
                  <input className="uk-input" value={form.scriptureRef} onChange={e => setForm(f => ({...f, scriptureRef: e.target.value}))} placeholder="Ex: João 3:16, Salmos 23" />
                </div>
                <div>
                  <label className="uk-form-label">Conteúdo / Anotações *</label>
                  <textarea className="uk-textarea" value={form.content} onChange={e => setForm(f => ({...f, content: e.target.value}))} rows={8} placeholder="Escreva as anotações, pontos principais, reflexões..." required style={{ resize: 'vertical' }} />
                </div>
                <div style={{ display: 'flex', gap: '10px', justifyContent: 'flex-end' }}>
                  <button type="button" onClick={() => setShowForm(false)} className="uk-button uk-button-default" style={{ fontSize: '13px' }}>Cancelar</button>
                  <button type="submit" disabled={saving} className="uk-button uk-button-primary" style={{ fontSize: '13px' }}>
                    {saving ? <span uk-spinner="ratio: 0.7"></span> : editing ? 'Salvar' : 'Publicar'}
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}
    </div>
  );
};

export default Sermons;
