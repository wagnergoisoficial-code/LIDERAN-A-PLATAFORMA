import React, { useState, useEffect, useCallback } from 'react';
import { api } from '../services/api';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';
import Avatar from '../components/Avatar';
import { SkeletonCard } from '../components/Skeleton';

interface Sermon {
  id: string;
  title: string;
  speaker: string;
  content: string;
  scriptureRef?: string;
  date: string;
  author: { id: string; name: string; profileImage?: string };
}

const EMPTY: Sermon = { id: '', title: '', speaker: '', content: '', scriptureRef: '', date: '' };

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
    <div style={{ minHeight: '100vh', background: 'var(--bg)', padding: '32px 24px' }}>
      <div style={{ maxWidth: '900px', margin: '0 auto' }}>

        {/* Header */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '28px', paddingBottom: '20px', borderBottom: '1px solid var(--border)' }}>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '4px' }}>
              <span uk-icon="icon: bookmark; ratio: 1.1" style={{ color: 'var(--accent)' }}></span>
              <h1 style={{ margin: 0, fontSize: '20px', fontWeight: 700, letterSpacing: '-0.02em', color: 'var(--text)' }}>Pregações</h1>
            </div>
            <p style={{ margin: 0, fontSize: '13px', color: 'var(--text-muted)' }}>Notas e estudos bíblicos da comunidade</p>
          </div>
          {isLeader && (
            <button onClick={openCreate} className="uk-button uk-button-primary" style={{ fontSize: '13px', display: 'flex', alignItems: 'center', gap: '6px' }}>
              <span uk-icon="icon: plus; ratio: 0.8"></span> Nova Pregação
            </button>
          )}
        </div>

        {/* Detail view */}
        {selected ? (
          <div className="fade-in">
            <button onClick={() => setSelected(null)} style={{ display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '20px', background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-muted)', fontSize: '13px', padding: 0 }}>
              <span uk-icon="icon: arrow-left; ratio: 0.8"></span> Voltar
            </button>
            <div style={{ border: '1px solid var(--border)', padding: '28px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '16px' }}>
                <div>
                  <h2 style={{ margin: '0 0 6px', fontSize: '20px', fontWeight: 700, color: 'var(--text)' }}>{selected.title}</h2>
                  <div style={{ display: 'flex', gap: '16px', flexWrap: 'wrap' }}>
                    <span style={{ fontSize: '13px', color: 'var(--text-muted)', display: 'flex', alignItems: 'center', gap: '4px' }}>
                      <span uk-icon="icon: user; ratio: 0.75"></span> {selected.speaker}
                    </span>
                    {selected.scriptureRef && (
                      <span style={{ fontSize: '13px', color: 'var(--accent)', display: 'flex', alignItems: 'center', gap: '4px' }}>
                        <span uk-icon="icon: book; ratio: 0.75"></span> {selected.scriptureRef}
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
                    <button onClick={() => openEdit(selected)} style={{ background: 'none', border: '1px solid var(--border)', padding: '6px 12px', cursor: 'pointer', fontSize: '12px', color: 'var(--text-muted)' }}>Editar</button>
                    <button onClick={() => handleDelete(selected.id)} style={{ background: 'none', border: '1px solid var(--danger)', padding: '6px 12px', cursor: 'pointer', fontSize: '12px', color: 'var(--danger)' }}>Excluir</button>
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
              <div style={{ textAlign: 'center', padding: '80px 20px', border: '1px dashed var(--border)', color: 'var(--text-faint)' }}>
                <span uk-icon="icon: bookmark; ratio: 2" style={{ display: 'block', marginBottom: '12px', color: 'var(--border-strong)' }}></span>
                <p style={{ margin: 0, fontSize: '14px' }}>Nenhuma pregação publicada ainda</p>
                {isLeader && <p style={{ margin: '8px 0 0', fontSize: '13px' }}>Clique em "Nova Pregação" para começar</p>}
              </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '2px' }}>
                {sermons.map((s, i) => (
                  <div
                    key={s.id}
                    className="fade-in-up"
                    style={{ animationDelay: `${i * 40}ms`, border: '1px solid var(--border)', padding: '16px 20px', cursor: 'pointer', transition: 'background var(--t), border-color var(--t)' }}
                    onClick={() => setSelected(s)}
                    onMouseEnter={e => (e.currentTarget.style.background = 'var(--bg-surface)')}
                    onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}
                  >
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                      <div style={{ flex: 1 }}>
                        <div style={{ fontWeight: 600, fontSize: '14px', color: 'var(--text)', marginBottom: '4px' }}>{s.title}</div>
                        <div style={{ display: 'flex', gap: '14px', flexWrap: 'wrap' }}>
                          <span style={{ fontSize: '12px', color: 'var(--text-muted)' }}>{s.speaker}</span>
                          {s.scriptureRef && <span style={{ fontSize: '12px', color: 'var(--accent)' }}>{s.scriptureRef}</span>}
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
          <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', zIndex: 1000, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '16px' }} onClick={e => { if (e.target === e.currentTarget) setShowForm(false); }}>
            <div className="fade-in" style={{ background: 'var(--bg)', border: '1px solid var(--border-strong)', width: '100%', maxWidth: '600px', maxHeight: '90vh', overflowY: 'auto' }}>
              <div style={{ padding: '16px 20px', borderBottom: '1px solid var(--border)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span style={{ fontWeight: 700, fontSize: '14px', color: 'var(--text)' }}>{editing ? 'Editar Pregação' : 'Nova Pregação'}</span>
                <button onClick={() => setShowForm(false)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-muted)' }}>
                  <span uk-icon="icon: close; ratio: 0.9"></span>
                </button>
              </div>
              <form onSubmit={handleSubmit} style={{ padding: '20px', display: 'flex', flexDirection: 'column', gap: '14px' }}>
                <div>
                  <label style={{ display: 'block', fontSize: '12px', fontWeight: 600, color: 'var(--text-muted)', marginBottom: '5px', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Título *</label>
                  <input className="uk-input" value={form.title} onChange={e => setForm(f => ({...f, title: e.target.value}))} placeholder="Título da pregação" required />
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                  <div>
                    <label style={{ display: 'block', fontSize: '12px', fontWeight: 600, color: 'var(--text-muted)', marginBottom: '5px', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Pregador *</label>
                    <input className="uk-input" value={form.speaker} onChange={e => setForm(f => ({...f, speaker: e.target.value}))} placeholder="Nome do pregador" required />
                  </div>
                  <div>
                    <label style={{ display: 'block', fontSize: '12px', fontWeight: 600, color: 'var(--text-muted)', marginBottom: '5px', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Data</label>
                    <input className="uk-input" type="date" value={form.date} onChange={e => setForm(f => ({...f, date: e.target.value}))} />
                  </div>
                </div>
                <div>
                  <label style={{ display: 'block', fontSize: '12px', fontWeight: 600, color: 'var(--text-muted)', marginBottom: '5px', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Referência bíblica</label>
                  <input className="uk-input" value={form.scriptureRef} onChange={e => setForm(f => ({...f, scriptureRef: e.target.value}))} placeholder="Ex: João 3:16, Salmos 23" />
                </div>
                <div>
                  <label style={{ display: 'block', fontSize: '12px', fontWeight: 600, color: 'var(--text-muted)', marginBottom: '5px', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Conteúdo / Anotações *</label>
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
    </div>
  );
};

export default Sermons;
