import React, { useState, useEffect } from 'react';
import { api } from '../services/api';
import { useAuth } from '../context/AuthContext';
import UIkit from 'uikit';

interface PrayerRequest {
  id: string; title: string; content: string;
  isAnonymous: boolean; isAnswered: boolean;
  userId: string | null; prayCount: number; hasPrayed: boolean;
  createdAt: string;
}

const Prayers: React.FC = () => {
  const { user } = useAuth();
  const [requests, setRequests] = useState<PrayerRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [form, setForm] = useState({ title: '', content: '', isAnonymous: false });
  const [saving, setSaving] = useState(false);
  const [filter, setFilter] = useState<'all' | 'active' | 'answered'>('active');

  const load = async () => {
    try {
      const res = await api.getPrayerRequests();
      if (res.success) setRequests(res.data);
    } catch { /* silent */ }
    finally { setLoading(false); }
  };

  useEffect(() => { load(); }, []);

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    try {
      const res = await api.createPrayerRequest(form);
      if (res.success) {
        setRequests(prev => [res.data, ...prev]);
        setShowModal(false);
        setForm({ title: '', content: '', isAnonymous: false });
        UIkit.notification({ message: 'Pedido enviado!', status: 'success', pos: 'top-right' });
      }
    } catch (err: any) {
      UIkit.notification({ message: err.message || 'Erro', status: 'danger', pos: 'top-right' });
    } finally { setSaving(false); }
  };

  const handlePray = async (id: string, hasPrayed: boolean) => {
    try {
      if (hasPrayed) {
        await api.unprayForRequest(id);
        setRequests(prev => prev.map(r => r.id === id ? { ...r, hasPrayed: false, prayCount: r.prayCount - 1 } : r));
      } else {
        await api.prayForRequest(id);
        setRequests(prev => prev.map(r => r.id === id ? { ...r, hasPrayed: true, prayCount: r.prayCount + 1 } : r));
      }
    } catch (err: any) {
      UIkit.notification({ message: err.message || 'Erro', status: 'danger', pos: 'top-right' });
    }
  };

  const handleMarkAnswered = async (id: string) => {
    try {
      await api.markPrayerAnswered(id);
      setRequests(prev => prev.map(r => r.id === id ? { ...r, isAnswered: true } : r));
      UIkit.notification({ message: 'Marcado como respondido!', status: 'success', pos: 'top-right' });
    } catch (err: any) {
      UIkit.notification({ message: err.message || 'Erro', status: 'danger', pos: 'top-right' });
    }
  };

  const handleDelete = async (id: string) => {
    try {
      await api.deletePrayerRequest(id);
      setRequests(prev => prev.filter(r => r.id !== id));
    } catch (err: any) {
      UIkit.notification({ message: err.message || 'Erro', status: 'danger', pos: 'top-right' });
    }
  };

  const filtered = requests.filter(r => {
    if (filter === 'active') return !r.isAnswered;
    if (filter === 'answered') return r.isAnswered;
    return true;
  });

  return (
    <div style={{ minHeight: '100vh', background: 'var(--bg)', padding: '32px 24px' }}>
      <div style={{ maxWidth: '700px', margin: '0 auto' }}>

        {/* Header */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '4px' }}>
              <span uk-icon="icon: heart; ratio: 1.1" style={{ color: 'var(--accent)' }}></span>
              <h1 style={{ margin: 0, fontSize: '20px', fontWeight: 700, color: 'var(--text)' }}>Pedidos de Oração</h1>
            </div>
            <p style={{ margin: 0, fontSize: '13px', color: 'var(--text-muted)' }}>Ore pelos membros da comunidade</p>
          </div>
          <button className="uk-button uk-button-primary" style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '13px', height: '36px', padding: '0 16px' }} onClick={() => setShowModal(true)}>
            <span uk-icon="icon: plus; ratio: 0.85"></span> Novo Pedido
          </button>
        </div>

        {/* Filter tabs */}
        <div style={{ display: 'flex', gap: '0', border: '1px solid var(--border)', marginBottom: '20px', width: 'fit-content' }}>
          {(['active', 'answered', 'all'] as const).map(f => {
            const labels = { active: 'Ativos', answered: 'Respondidos', all: 'Todos' };
            return (
              <button key={f} onClick={() => setFilter(f)} style={{ height: '32px', padding: '0 14px', fontSize: '12px', fontWeight: 600, border: 'none', borderRight: f !== 'all' ? '1px solid var(--border)' : 'none', background: filter === f ? 'var(--accent)' : 'transparent', color: filter === f ? 'white' : 'var(--text-muted)', cursor: 'pointer' }}>
                {labels[f]}
              </button>
            );
          })}
        </div>

        {loading ? (
          <div style={{ textAlign: 'center', padding: '60px' }}><span uk-spinner="ratio: 1.2"></span></div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
            {filtered.map(r => (
              <div key={r.id} style={{ border: `1px solid ${r.isAnswered ? 'var(--success)' : 'var(--border-strong)'}`, background: 'var(--bg)', padding: '16px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '8px' }}>
                  <div style={{ flex: 1, paddingRight: '12px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '4px' }}>
                      <span style={{ fontWeight: 700, fontSize: '14px', color: 'var(--text)' }}>{r.title}</span>
                      {r.isAnswered && (
                        <span style={{ fontSize: '11px', fontWeight: 700, color: 'var(--success)', border: '1px solid var(--success)', padding: '1px 6px', letterSpacing: '0.05em' }}>RESPONDIDO</span>
                      )}
                      {r.isAnonymous && (
                        <span style={{ fontSize: '11px', color: 'var(--text-faint)', border: '1px solid var(--border)', padding: '1px 6px' }}>Anônimo</span>
                      )}
                    </div>
                    <p style={{ margin: 0, fontSize: '13px', color: 'var(--text-muted)', lineHeight: 1.5 }}>{r.content}</p>
                  </div>
                  <div style={{ display: 'flex', gap: '6px', flexShrink: 0 }}>
                    {(r.userId === user?.id || user?.role === 'leader' || user?.role === 'admin') && !r.isAnswered && (
                      <button className="action-btn" title="Marcar como respondido" onClick={() => handleMarkAnswered(r.id)}>
                        <span uk-icon="icon: check; ratio: 0.8"></span>
                      </button>
                    )}
                    {(r.userId === user?.id || user?.role === 'admin') && (
                      <button className="action-btn danger" title="Excluir" onClick={() => handleDelete(r.id)}>
                        <span uk-icon="icon: trash; ratio: 0.8"></span>
                      </button>
                    )}
                  </div>
                </div>

                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginTop: '12px', paddingTop: '10px', borderTop: '1px solid var(--border)' }}>
                  <span style={{ fontSize: '12px', color: 'var(--text-faint)' }}>
                    {new Date(r.createdAt).toLocaleDateString('pt-BR', { day: '2-digit', month: 'short', year: 'numeric' })}
                  </span>
                  <button
                    onClick={() => handlePray(r.id, r.hasPrayed)}
                    style={{ display: 'flex', alignItems: 'center', gap: '6px', height: '30px', padding: '0 12px', fontSize: '12px', fontWeight: 600, border: `1px solid ${r.hasPrayed ? 'var(--accent)' : 'var(--border-strong)'}`, background: r.hasPrayed ? 'var(--accent-light)' : 'transparent', color: r.hasPrayed ? 'var(--accent)' : 'var(--text-muted)', cursor: 'pointer' }}>
                    <span uk-icon={`icon: heart; ratio: 0.8`}></span>
                    {r.prayCount > 0 ? r.prayCount : ''} {r.hasPrayed ? 'Orando' : 'Orar'}
                  </button>
                </div>
              </div>
            ))}

            {filtered.length === 0 && (
              <div style={{ textAlign: 'center', padding: '80px 20px', border: '1px dashed var(--border)', color: 'var(--text-faint)' }}>
                <span uk-icon="icon: heart; ratio: 2" style={{ display: 'block', marginBottom: '12px' }}></span>
                <p style={{ margin: 0, fontSize: '14px' }}>Nenhum pedido de oração</p>
              </div>
            )}
          </div>
        )}
      </div>

      {showModal && (
        <div className="modal-overlay" onClick={() => setShowModal(false)}>
          <div className="modal-box" style={{ maxWidth: '440px' }} onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <span style={{ fontWeight: 700, fontSize: '15px' }}>Novo Pedido de Oração</span>
              <button className="action-btn" onClick={() => setShowModal(false)}><span uk-icon="icon: close; ratio: 0.85"></span></button>
            </div>
            <form onSubmit={handleCreate}>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
                <div>
                  <label className="form-label">Título *</label>
                  <input className="form-input uk-width-1-1" type="text" placeholder="Assunto do pedido" value={form.title} onChange={e => setForm(f => ({ ...f, title: e.target.value }))} required />
                </div>
                <div>
                  <label className="form-label">Detalhes *</label>
                  <textarea className="form-input uk-width-1-1" placeholder="Descreva o pedido de oração..." rows={4} style={{ height: 'auto', padding: '8px' }} value={form.content} onChange={e => setForm(f => ({ ...f, content: e.target.value }))} required />
                </div>
                <label style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '13px', color: 'var(--text-muted)', cursor: 'pointer' }}>
                  <input type="checkbox" checked={form.isAnonymous} onChange={e => setForm(f => ({ ...f, isAnonymous: e.target.checked }))} />
                  Enviar anonimamente
                </label>
              </div>
              <div className="form-btn-row" style={{ marginTop: '20px' }}>
                <button type="button" className="form-btn" onClick={() => setShowModal(false)}>Cancelar</button>
                <button type="submit" className="form-btn primary" disabled={saving}>
                  {saving ? <><span uk-spinner="ratio: 0.5"></span> Enviando...</> : 'Enviar Pedido'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default Prayers;
