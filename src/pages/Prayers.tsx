import React, { useState, useEffect } from 'react';
import { api } from '../services/api';
import { useAuth } from '../context/AuthContext';
import UIkit from 'uikit';
import Avatar from '../components/Avatar';
import PageHeader from '../components/PageHeader';
import EmptyState from '../components/EmptyState';
import AnimatedNumber from '../components/AnimatedNumber';
import { pop, burst, celebrate } from '../lib/motion';

interface PrayerRequest {
  id: string; title: string; content: string;
  isAnonymous: boolean; isAnswered: boolean;
  userId: string | null; prayCount: number; hasPrayed: boolean;
  authorName?: string | null; authorProfileImage?: string | null;
  isMine?: boolean; prayingNames?: string[];
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

  const replace = (updated?: PrayerRequest) => {
    if (updated) setRequests(prev => prev.map(r => r.id === updated.id ? updated : r));
  };

  const handlePray = async (id: string, hasPrayed: boolean) => {
    try {
      const res = hasPrayed ? await api.unprayForRequest(id) : await api.prayForRequest(id);
      replace(res.data);
    } catch (err: any) {
      UIkit.notification({ message: err.message || 'Erro', status: 'danger', pos: 'top-right' });
    }
  };

  // A posição do botão é guardada antes: ele desaparece quando o pedido fica respondido
  const handleMarkAnswered = async (id: string, origin?: DOMRect) => {
    try {
      const res = await api.markPrayerAnswered(id);
      celebrate(origin, ['--success', '--accent', '--success-dark']);
      replace(res.data);
      UIkit.notification({ message: 'Marcado como respondido!', status: 'success', pos: 'top-right' });
    } catch (err: any) {
      UIkit.notification({ message: err.message || 'Erro', status: 'danger', pos: 'top-right' });
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Excluir este pedido de oração?')) return;
    try {
      await api.deletePrayerRequest(id);
      setRequests(prev => prev.filter(r => r.id !== id));
    } catch (err: any) {
      UIkit.notification({ message: err.message || 'Erro', status: 'danger', pos: 'top-right' });
    }
  };

  const isLeader = user?.role === 'leader' || user?.role === 'admin';
  const canManage = (r: PrayerRequest) => !!r.isMine || r.userId === user?.id || isLeader;

  const filtered = requests.filter(r => {
    if (filter === 'active') return !r.isAnswered;
    if (filter === 'answered') return r.isAnswered;
    return true;
  });

  return (
    <div>
        <PageHeader
          icon="heart"
          title="Pedidos de Oração"
          subtitle="Ore pelos membros da comunidade"
          actions={(
            <button className="uk-button uk-button-primary" onClick={() => setShowModal(true)}>
              <span uk-icon="icon: plus; ratio: 0.85"></span> Novo Pedido
            </button>
          )}
        />

        {/* Filter tabs */}
        <div style={{ display: 'flex', gap: '0', border: '1px solid var(--border)', borderRadius: 'var(--radius-sm)', overflow: 'hidden', marginBottom: '20px', width: 'fit-content' }}>
          {(['active', 'answered', 'all'] as const).map(f => {
            const labels = { active: 'Ativos', answered: 'Respondidos', all: 'Todos' };
            return (
              <button key={f} className="press" onClick={() => setFilter(f)} style={{ height: '32px', padding: '0 14px', fontSize: '12px', fontWeight: 600, fontFamily: 'inherit', border: 'none', borderRight: f !== 'all' ? '1px solid var(--border)' : 'none', background: filter === f ? 'var(--accent)' : 'transparent', color: filter === f ? 'white' : 'var(--text-muted)', cursor: 'pointer' }}>
                {labels[f]}
              </button>
            );
          })}
        </div>

        {loading ? (
          <div style={{ textAlign: 'center', padding: '60px' }}><span uk-spinner="ratio: 1.2"></span></div>
        ) : (
          <div key={filter} className="stagger" style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
            {filtered.map(r => (
              <div key={r.id} className="card" style={{ padding: '16px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '8px' }}>
                  <div style={{ flex: 1, paddingRight: '12px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '4px' }}>
                      <span style={{ fontWeight: 700, fontSize: '14px', color: 'var(--text)' }}>{r.title}</span>
                      {r.isAnswered && (
                        <span className="uk-label">Respondido</span>
                      )}
                      {r.isAnonymous && (
                        <span className="uk-label">Anônimo</span>
                      )}
                    </div>
                    <p style={{ margin: 0, fontSize: '13px', color: 'var(--text-muted)', lineHeight: 1.5 }}>{r.content}</p>
                  </div>
                  <div style={{ display: 'flex', gap: '6px', flexShrink: 0 }}>
                    {canManage(r) && !r.isAnswered && (
                      <button className="uk-button uk-button-success uk-button-small" title="Marcar como respondido" onClick={e => handleMarkAnswered(r.id, e.currentTarget.getBoundingClientRect())}>
                        <span uk-icon="icon: check; ratio: 0.75"></span> Respondido
                      </button>
                    )}
                    {canManage(r) && (
                      <button className="uk-button uk-button-danger uk-button-small" title="Excluir pedido" onClick={() => handleDelete(r.id)}>
                        <span uk-icon="icon: trash; ratio: 0.75"></span> Excluir
                      </button>
                    )}
                  </div>
                </div>

                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginTop: '12px', paddingTop: '10px', borderTop: '1px solid var(--border)' }}>
                  <span style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '12px', color: 'var(--text-faint)', minWidth: 0 }}>
                    {r.isAnonymous || !r.authorName ? (
                      <span>{r.isMine ? 'Você (anônimo)' : 'Pedido anônimo'}</span>
                    ) : (
                      <>
                        <Avatar name={r.authorName} profileImage={r.authorProfileImage || undefined} size="small" />
                        <strong style={{ color: 'var(--text-muted)', fontWeight: 600 }}>{r.isMine ? 'Você' : r.authorName}</strong>
                      </>
                    )}
                    <span>· {new Date(r.createdAt).toLocaleDateString('pt-BR', { day: '2-digit', month: 'short', year: 'numeric' })}</span>
                    {r.prayingNames && r.prayingNames.length > 0 && (
                      <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                        · {r.prayingNames.slice(0, 2).join(', ')}{r.prayCount > 2 ? ` e mais ${r.prayCount - 2}` : ''} {r.prayCount === 1 ? 'está orando' : 'estão orando'}
                      </span>
                    )}
                  </span>
                  <button
                    className="press"
                    onClick={e => {
                      if (!r.hasPrayed) { pop(e.currentTarget); burst(e.currentTarget, { count: 7 }); }
                      handlePray(r.id, r.hasPrayed);
                    }}
                    style={{ display: 'flex', alignItems: 'center', gap: '6px', height: '30px', padding: '0 12px', fontSize: '12px', fontWeight: 600, fontFamily: 'inherit', borderRadius: 'var(--radius-sm)', border: `1px solid ${r.hasPrayed ? 'var(--accent)' : 'var(--border-strong)'}`, background: r.hasPrayed ? 'var(--accent)' : 'transparent', color: r.hasPrayed ? '#fff' : 'var(--text-muted)', cursor: 'pointer' }}>
                    <span uk-icon={`icon: heart; ratio: 0.8`}></span>
                    {r.prayCount > 0 && <AnimatedNumber value={r.prayCount} />} {r.hasPrayed ? 'Orando' : 'Orar'}
                  </button>
                </div>
              </div>
            ))}

            {filtered.length === 0 && (
              <EmptyState icon="heart" title="Nenhum pedido de oração" text="Os pedidos da comunidade aparecem aqui" />
            )}
          </div>
        )}

      {showModal && (
        <div className="modal-overlay" onClick={() => setShowModal(false)}>
          <div className="modal-box" style={{ maxWidth: '440px' }} onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <h4>Novo Pedido de Oração</h4>
              <button className="modal-close-btn" onClick={() => setShowModal(false)}><span uk-icon="icon: close; ratio: 0.9"></span></button>
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
