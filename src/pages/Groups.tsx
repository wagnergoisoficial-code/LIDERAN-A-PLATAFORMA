import React, { useState, useEffect, useCallback } from 'react';
import { api } from '../services/api';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';
import Avatar from '../components/Avatar';
import { SkeletonList } from '../components/Skeleton';

interface GroupMember {
  id: string;
  userId: string;
  role: string;
  user: { id: string; name: string; profileImage?: string };
}

interface Group {
  id: string;
  name: string;
  description?: string;
  category: string;
  leaderId: string;
  leader: { id: string; name: string; profileImage?: string };
  members: GroupMember[];
  memberCount: number;
  isMember: boolean;
  isLeader: boolean;
}

const CATEGORIES: Record<string, string> = {
  celula: 'Célula',
  ministerio: 'Ministério',
  jovens: 'Jovens',
  casais: 'Casais',
  infantil: 'Infantil',
  louvor: 'Louvor',
  outro: 'Outro',
};

const Groups: React.FC = () => {
  const { user } = useAuth();
  const { toast } = useToast();
  const [groups, setGroups] = useState<Group[]>([]);
  const [loading, setLoading] = useState(true);
  const [selected, setSelected] = useState<Group | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({ name: '', description: '', category: 'celula' });
  const [saving, setSaving] = useState(false);
  const [joining, setJoining] = useState<string | null>(null);

  const isLeader = user?.role === 'leader' || user?.role === 'admin';

  const load = useCallback(async () => {
    try {
      const res = await api.getGroups();
      if (res.success) setGroups(res.data || []);
    } catch { toast('Erro ao carregar grupos', 'error'); }
    finally { setLoading(false); }
  }, []);

  useEffect(() => { load(); }, [load]);

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.name.trim()) return;
    setSaving(true);
    try {
      const res = await api.createGroup(form);
      if (res.success) {
        setGroups(prev => [res.data, ...prev]);
        setShowForm(false);
        setForm({ name: '', description: '', category: 'celula' });
        toast('Grupo criado com sucesso', 'success');
      }
    } catch { toast('Erro ao criar grupo', 'error'); }
    finally { setSaving(false); }
  };

  const handleJoin = async (groupId: string, isMember: boolean) => {
    setJoining(groupId);
    try {
      if (isMember) {
        await api.leaveGroup(groupId);
        setGroups(prev => prev.map(g =>
          g.id === groupId
            ? { ...g, isMember: false, memberCount: g.memberCount - 1, members: g.members.filter(m => m.userId !== user?.id) }
            : g
        ));
        if (selected?.id === groupId) setSelected(prev => prev ? { ...prev, isMember: false, memberCount: prev.memberCount - 1 } : null);
        toast('Você saiu do grupo', 'info');
      } else {
        await api.joinGroup(groupId);
        setGroups(prev => prev.map(g =>
          g.id === groupId ? { ...g, isMember: true, memberCount: g.memberCount + 1 } : g
        ));
        if (selected?.id === groupId) setSelected(prev => prev ? { ...prev, isMember: true, memberCount: prev.memberCount + 1 } : null);
        toast('Você entrou no grupo', 'success');
      }
    } catch { toast('Erro ao atualizar participação', 'error'); }
    finally { setJoining(null); }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Excluir este grupo?')) return;
    try {
      await api.deleteGroup(id);
      setGroups(prev => prev.filter(g => g.id !== id));
      if (selected?.id === id) setSelected(null);
      toast('Grupo excluído', 'success');
    } catch { toast('Erro ao excluir', 'error'); }
  };

  const CategoryBadge = ({ cat }: { cat: string }) => (
    <span style={{ fontSize: '10px', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.06em', padding: '2px 8px', background: 'var(--accent-light)', color: 'var(--accent)', border: '1px solid var(--accent)' }}>
      {CATEGORIES[cat] || cat}
    </span>
  );

  return (
    <div style={{ minHeight: '100vh', background: 'var(--bg)', padding: '32px 24px' }}>
      <div style={{ maxWidth: '900px', margin: '0 auto' }}>

        {/* Header */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '28px', paddingBottom: '20px', borderBottom: '1px solid var(--border)' }}>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '4px' }}>
              <span uk-icon="icon: users; ratio: 1.1" style={{ color: 'var(--accent)' }}></span>
              <h1 style={{ margin: 0, fontSize: '20px', fontWeight: 700, letterSpacing: '-0.02em', color: 'var(--text)' }}>Células & Ministérios</h1>
            </div>
            <p style={{ margin: 0, fontSize: '13px', color: 'var(--text-muted)' }}>Grupos e ministérios da comunidade</p>
          </div>
          {isLeader && (
            <button onClick={() => setShowForm(true)} className="uk-button uk-button-primary" style={{ fontSize: '13px', display: 'flex', alignItems: 'center', gap: '6px' }}>
              <span uk-icon="icon: plus; ratio: 0.8"></span> Novo Grupo
            </button>
          )}
        </div>

        {/* Detail */}
        {selected ? (
          <div className="fade-in">
            <button onClick={() => setSelected(null)} style={{ display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '20px', background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-muted)', fontSize: '13px', padding: 0 }}>
              <span uk-icon="icon: arrow-left; ratio: 0.8"></span> Voltar
            </button>
            <div style={{ border: '1px solid var(--border)', padding: '24px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '16px' }}>
                <div>
                  <div style={{ display: 'flex', gap: '10px', alignItems: 'center', marginBottom: '6px' }}>
                    <h2 style={{ margin: 0, fontSize: '18px', fontWeight: 700, color: 'var(--text)' }}>{selected.name}</h2>
                    <CategoryBadge cat={selected.category} />
                  </div>
                  {selected.description && <p style={{ margin: '0 0 8px', fontSize: '13px', color: 'var(--text-muted)' }}>{selected.description}</p>}
                  <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '12px', color: 'var(--text-faint)' }}>
                    <Avatar name={selected.leader.name} profileImage={selected.leader.profileImage} size="small" />
                    Líder: <strong style={{ color: 'var(--text-muted)' }}>{selected.leader.name}</strong>
                  </div>
                </div>
                <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                  {selected.leaderId !== user?.id && (
                    <button
                      onClick={() => handleJoin(selected.id, selected.isMember)}
                      disabled={joining === selected.id}
                      className={`uk-button ${selected.isMember ? 'uk-button-default' : 'uk-button-primary'}`}
                      style={{ fontSize: '13px' }}
                    >
                      {joining === selected.id ? <span uk-spinner="ratio: 0.7"></span> : selected.isMember ? 'Sair do grupo' : 'Participar'}
                    </button>
                  )}
                  {isLeader && (
                    <button onClick={() => handleDelete(selected.id)} style={{ background: 'none', border: '1px solid var(--danger)', padding: '6px 12px', cursor: 'pointer', fontSize: '12px', color: 'var(--danger)' }}>Excluir</button>
                  )}
                </div>
              </div>

              <div style={{ marginTop: '20px', paddingTop: '16px', borderTop: '1px solid var(--border)' }}>
                <div style={{ fontSize: '12px', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.06em', color: 'var(--text-faint)', marginBottom: '12px' }}>
                  {selected.memberCount} {selected.memberCount === 1 ? 'membro' : 'membros'}
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                  {selected.members.map(m => (
                    <div key={m.id} style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                      <Avatar name={m.user.name} profileImage={m.user.profileImage} size="small" />
                      <span style={{ fontSize: '13px', color: 'var(--text)' }}>{m.user.name}</span>
                      {m.userId === selected.leaderId && (
                        <span style={{ fontSize: '10px', color: 'var(--accent)', fontWeight: 700 }}>LÍDER</span>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        ) : (
          <>
            {loading ? <SkeletonList count={4} /> : groups.length === 0 ? (
              <div style={{ textAlign: 'center', padding: '80px 20px', border: '1px dashed var(--border)', color: 'var(--text-faint)' }}>
                <span uk-icon="icon: users; ratio: 2" style={{ display: 'block', marginBottom: '12px', color: 'var(--border-strong)' }}></span>
                <p style={{ margin: 0, fontSize: '14px' }}>Nenhum grupo criado ainda</p>
              </div>
            ) : (
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: '12px' }}>
                {groups.map((g, i) => (
                  <div
                    key={g.id}
                    className="fade-in-up"
                    style={{ animationDelay: `${i * 50}ms`, border: '1px solid var(--border)', padding: '18px', cursor: 'pointer', transition: 'border-color var(--t), box-shadow var(--t)' }}
                    onClick={() => setSelected(g)}
                    onMouseEnter={e => (e.currentTarget.style.borderColor = 'var(--accent)')}
                    onMouseLeave={e => (e.currentTarget.style.borderColor = 'var(--border)')}
                  >
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '10px' }}>
                      <CategoryBadge cat={g.category} />
                      {g.isMember && <span style={{ fontSize: '10px', fontWeight: 700, color: 'var(--success)' }}>● MEMBRO</span>}
                    </div>
                    <div style={{ fontWeight: 700, fontSize: '15px', color: 'var(--text)', marginBottom: '4px' }}>{g.name}</div>
                    {g.description && <div style={{ fontSize: '12px', color: 'var(--text-muted)', marginBottom: '10px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{g.description}</div>}
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '12px' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                        <Avatar name={g.leader.name} profileImage={g.leader.profileImage} size="small" />
                        <span style={{ fontSize: '11px', color: 'var(--text-faint)' }}>{g.leader.name}</span>
                      </div>
                      <span style={{ fontSize: '11px', color: 'var(--text-faint)' }}>{g.memberCount} membros</span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </>
        )}

        {/* Create modal */}
        {showForm && (
          <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', zIndex: 1000, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '16px' }} onClick={e => { if (e.target === e.currentTarget) setShowForm(false); }}>
            <div className="fade-in" style={{ background: 'var(--bg)', border: '1px solid var(--border-strong)', width: '100%', maxWidth: '460px' }}>
              <div style={{ padding: '16px 20px', borderBottom: '1px solid var(--border)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span style={{ fontWeight: 700, fontSize: '14px', color: 'var(--text)' }}>Novo Grupo</span>
                <button onClick={() => setShowForm(false)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-muted)' }}>
                  <span uk-icon="icon: close; ratio: 0.9"></span>
                </button>
              </div>
              <form onSubmit={handleCreate} style={{ padding: '20px', display: 'flex', flexDirection: 'column', gap: '14px' }}>
                <div>
                  <label style={{ display: 'block', fontSize: '12px', fontWeight: 600, color: 'var(--text-muted)', marginBottom: '5px', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Nome *</label>
                  <input className="uk-input" value={form.name} onChange={e => setForm(f => ({...f, name: e.target.value}))} placeholder="Nome do grupo" required />
                </div>
                <div>
                  <label style={{ display: 'block', fontSize: '12px', fontWeight: 600, color: 'var(--text-muted)', marginBottom: '5px', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Tipo</label>
                  <select className="uk-select" value={form.category} onChange={e => setForm(f => ({...f, category: e.target.value}))}>
                    {Object.entries(CATEGORIES).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
                  </select>
                </div>
                <div>
                  <label style={{ display: 'block', fontSize: '12px', fontWeight: 600, color: 'var(--text-muted)', marginBottom: '5px', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Descrição</label>
                  <textarea className="uk-textarea" value={form.description} onChange={e => setForm(f => ({...f, description: e.target.value}))} rows={3} placeholder="Breve descrição do grupo..." style={{ resize: 'none' }} />
                </div>
                <div style={{ display: 'flex', gap: '10px', justifyContent: 'flex-end' }}>
                  <button type="button" onClick={() => setShowForm(false)} className="uk-button uk-button-default" style={{ fontSize: '13px' }}>Cancelar</button>
                  <button type="submit" disabled={saving} className="uk-button uk-button-primary" style={{ fontSize: '13px' }}>
                    {saving ? <span uk-spinner="ratio: 0.7"></span> : 'Criar Grupo'}
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

export default Groups;
