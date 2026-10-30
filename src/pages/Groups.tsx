import React, { useState, useEffect, useCallback } from 'react';
import { api } from '../services/api';
import { burst } from '../lib/motion';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';
import Avatar from '../components/Avatar';
import { SkeletonList } from '../components/Skeleton';
import PageHeader from '../components/PageHeader';
import EmptyState from '../components/EmptyState';

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
  const [editingId, setEditingId] = useState<string | null>(null);
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

  const openCreate = () => {
    setEditingId(null);
    setForm({ name: '', description: '', category: 'celula' });
    setShowForm(true);
  };

  const openEdit = (g: Group) => {
    setEditingId(g.id);
    setForm({ name: g.name, description: g.description || '', category: g.category });
    setShowForm(true);
  };

  // Atualiza o grupo na lista e no detalhe com os dados devolvidos pelo servidor
  const replaceGroup = (g: Group) => {
    setGroups(prev => prev.map(item => item.id === g.id ? g : item));
    setSelected(prev => prev?.id === g.id ? g : prev);
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.name.trim()) return;
    setSaving(true);
    try {
      const res = editingId ? await api.updateGroup(editingId, form) : await api.createGroup(form);
      if (res.success) {
        if (editingId) replaceGroup(res.data);
        else setGroups(prev => [res.data, ...prev]);
        setShowForm(false);
        setEditingId(null);
        setForm({ name: '', description: '', category: 'celula' });
        toast(editingId ? 'Grupo atualizado' : 'Grupo criado com sucesso', 'success');
      }
    } catch (err: any) { toast(err.message || 'Erro ao salvar grupo', 'error'); }
    finally { setSaving(false); }
  };

  const handleJoin = async (groupId: string, isMember: boolean) => {
    setJoining(groupId);
    try {
      const res = isMember ? await api.leaveGroup(groupId) : await api.joinGroup(groupId);
      if (res.data) replaceGroup(res.data);
      toast(isMember ? 'Você saiu do grupo' : 'Você entrou no grupo', isMember ? 'info' : 'success');
    } catch (err: any) { toast(err.message || 'Erro ao atualizar participação', 'error'); }
    finally { setJoining(null); }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Excluir este grupo?')) return;
    try {
      await api.deleteGroup(id);
      setGroups(prev => prev.filter(g => g.id !== id));
      if (selected?.id === id) setSelected(null);
      toast('Grupo excluído', 'success');
    } catch (err: any) { toast(err.message || 'Erro ao excluir', 'error'); }
  };

  const canManage = (g: Group) => isLeader || g.leaderId === user?.id;

  const CategoryBadge = ({ cat }: { cat: string }) => (
    <span className="uk-label">{CATEGORIES[cat] || cat}</span>
  );

  return (
    <div>
        <PageHeader
          icon="users"
          title="Células & Ministérios"
          subtitle="Grupos e ministérios da comunidade"
          actions={isLeader && (
            <button onClick={openCreate} className="uk-button uk-button-primary">
              <span uk-icon="icon: plus; ratio: 0.8"></span> Novo Grupo
            </button>
          )}
        />

        {/* Detail */}
        {selected ? (
          <div className="fade-in">
            <button onClick={() => setSelected(null)} style={{ display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '20px', background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-muted)', fontSize: '13px', padding: 0 }}>
              <span uk-icon="icon: arrow-left; ratio: 0.8"></span> Voltar
            </button>
            <div className="card" style={{ padding: '24px' }}>
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
                      onClick={e => {
                        if (!selected.isMember) burst(e.currentTarget, { count: 9, colors: ['--accent', '--success'], spread: 18 });
                        handleJoin(selected.id, selected.isMember);
                      }}
                      disabled={joining === selected.id}
                      className={`uk-button ${selected.isMember ? 'uk-button-default' : 'uk-button-primary'}`}
                      style={{ fontSize: '13px' }}
                    >
                      {joining === selected.id ? <span uk-spinner="ratio: 0.7"></span> : selected.isMember ? 'Sair do grupo' : 'Participar'}
                    </button>
                  )}
                  {canManage(selected) && (
                    <>
                      <button onClick={() => openEdit(selected)} className="uk-button uk-button-default uk-button-small">
                        <span uk-icon="icon: pencil; ratio: 0.75"></span> Editar
                      </button>
                      <button onClick={() => handleDelete(selected.id)} className="uk-button uk-button-danger uk-button-small">
                        <span uk-icon="icon: trash; ratio: 0.75"></span> Excluir
                      </button>
                    </>
                  )}
                </div>
              </div>

              <div style={{ marginTop: '20px', paddingTop: '16px', borderTop: '1px solid var(--border)' }}>
                <div className="list-label">
                  {selected.memberCount} {selected.memberCount === 1 ? 'membro' : 'membros'}
                </div>
                <div className="stagger" style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                  {selected.members.map(m => (
                    <div key={m.id} style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                      <Avatar name={m.user.name} profileImage={m.user.profileImage} size="small" />
                      <span style={{ fontSize: '13px', color: 'var(--text)' }}>{m.user.name}</span>
                      {m.userId === selected.leaderId && (
                        <span className="uk-label">Líder</span>
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
              <EmptyState icon="users" title="Nenhum grupo criado ainda" text="As células e ministérios aparecem aqui" />
            ) : (
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: '12px' }}>
                {groups.map((g, i) => (
                  <div
                    key={g.id}
                    className="card fade-in-up"
                    style={{ animationDelay: `${i * 50}ms`, padding: '18px', cursor: 'pointer', transition: 'border-color var(--t)' }}
                    onClick={() => setSelected(g)}
                    onMouseEnter={e => (e.currentTarget.style.borderColor = 'var(--border-strong)')}
                    onMouseLeave={e => (e.currentTarget.style.borderColor = 'var(--border)')}
                  >
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '10px' }}>
                      <CategoryBadge cat={g.category} />
                      {g.isMember && <span className="uk-label">Membro</span>}
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
          <div className="modal-overlay" onClick={e => { if (e.target === e.currentTarget) setShowForm(false); }}>
            <div className="modal-box" style={{ maxWidth: '460px' }}>
              <div className="modal-header">
                <h4>{editingId ? 'Editar Grupo' : 'Novo Grupo'}</h4>
                <button className="modal-close-btn" onClick={() => setShowForm(false)}>
                  <span uk-icon="icon: close; ratio: 0.9"></span>
                </button>
              </div>
              <form onSubmit={handleSave} style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
                <div>
                  <label className="uk-form-label">Nome *</label>
                  <input className="uk-input" value={form.name} onChange={e => setForm(f => ({...f, name: e.target.value}))} placeholder="Nome do grupo" required />
                </div>
                <div>
                  <label className="uk-form-label">Tipo</label>
                  <select className="uk-select" value={form.category} onChange={e => setForm(f => ({...f, category: e.target.value}))}>
                    {Object.entries(CATEGORIES).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
                  </select>
                </div>
                <div>
                  <label className="uk-form-label">Descrição</label>
                  <textarea className="uk-textarea" value={form.description} onChange={e => setForm(f => ({...f, description: e.target.value}))} rows={3} placeholder="Breve descrição do grupo..." style={{ resize: 'none' }} />
                </div>
                <div style={{ display: 'flex', gap: '10px', justifyContent: 'flex-end' }}>
                  <button type="button" onClick={() => setShowForm(false)} className="uk-button uk-button-default" style={{ fontSize: '13px' }}>Cancelar</button>
                  <button type="submit" disabled={saving} className="uk-button uk-button-primary" style={{ fontSize: '13px' }}>
                    {saving ? <span uk-spinner="ratio: 0.7"></span> : editingId ? 'Salvar Alterações' : 'Criar Grupo'}
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}
    </div>
  );
};

export default Groups;
