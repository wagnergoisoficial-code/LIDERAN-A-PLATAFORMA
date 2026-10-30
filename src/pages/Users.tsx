import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { api } from '../services/api';
import { useAuth } from '../context/AuthContext';
import UIkit from 'uikit';
import Avatar from '../components/Avatar';
import PageHeader from '../components/PageHeader';
import EmptyState from '../components/EmptyState';

interface Member {
  id: string; name: string; email: string; role: string;
  title?: string; location?: string; age?: number; profileImage?: string;
}

interface MemberStat {
  userId: string; posts: number; comments: number; messages: number;
  total: number; percentage: number;
}

const emptyAddForm = { name: '', email: '', password: '', confirmPassword: '', age: '', title: '', location: '' };

const engagementColor = (pct: number) => {
  if (pct >= 30) return 'var(--success)';
  if (pct >= 15) return 'var(--accent)';
  if (pct >= 5)  return 'var(--text-muted)';
  return 'var(--text-faint)';
};

const EngagementBar = ({ stat }: { stat: MemberStat | undefined }) => {
  if (!stat) return <span style={{ color: 'var(--text-faint)', fontSize: '12px' }}>—</span>;
  const pct = stat.percentage;
  const color = engagementColor(pct);
  return (
    <div title={`Posts: ${stat.posts} · Comentários: ${stat.comments} · Mensagens: ${stat.messages}`} style={{ minWidth: '100px' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
        <div className="engagement-track" style={{ flex: 1 }}>
          <div className="engagement-fill meter-fill" style={{ transform: `scaleX(${pct / 100})`, background: color }} />
        </div>
        <span style={{ fontSize: '11px', fontWeight: 700, color: 'var(--text)', minWidth: '30px', textAlign: 'right' }}>{pct}%</span>
      </div>
      <div style={{ fontSize: '10px', color: 'var(--text-faint)', marginTop: '2px' }}>
        {stat.posts}p · {stat.comments}c · {stat.messages}m
      </div>
    </div>
  );
};

const Users = () => {
  const { user } = useAuth();
  const isLeaderOrAdmin = user?.role === 'leader' || user?.role === 'admin';
  const churchId = user?.churchId || '';

  const [members, setMembers] = useState<Member[]>([]);
  const [stats, setStats] = useState<Record<string, MemberStat>>({});
  const [loading, setLoading] = useState(true);
  const [showAddModal, setShowAddModal] = useState(false);
  const [addForm, setAddForm] = useState({ ...emptyAddForm });
  const [addLoading, setAddLoading] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [editingMember, setEditingMember] = useState<Member | null>(null);
  const [editForm, setEditForm] = useState({ name: '', title: '', location: '', age: '' });
  const [editLoading, setEditLoading] = useState(false);
  const [deletingMemberId, setDeletingMemberId] = useState<string | null>(null);
  const [deleteLoading, setDeleteLoading] = useState(false);

  useEffect(() => { loadAll(); }, []);

  const loadAll = async () => {
    setLoading(true);
    try {
      const [membersRes, statsRes] = await Promise.all([
        api.getUsers(),
        churchId ? api.getChurchMemberStats(churchId) : Promise.resolve({ success: false, data: [] }),
      ]);
      if (membersRes.success) setMembers(membersRes.data || []);
      if (statsRes.success && Array.isArray(statsRes.data)) {
        const map: Record<string, MemberStat> = {};
        statsRes.data.forEach((s: MemberStat) => { map[s.userId] = s; });
        setStats(map);
      }
    } catch {
      UIkit.notification({ message: 'Erro ao carregar membros', status: 'danger', pos: 'top-right' });
    } finally {
      setLoading(false);
    }
  };

  const handleAddChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setAddForm(prev => ({ ...prev, [name]: value }));
  };

  const handleAddSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (addForm.password !== addForm.confirmPassword) {
      UIkit.notification({ message: 'As senhas não conferem', status: 'danger', pos: 'top-right' }); return;
    }
    if (!addForm.name.trim() || !addForm.email.trim()) {
      UIkit.notification({ message: 'Nome e email são obrigatórios', status: 'danger', pos: 'top-right' }); return;
    }
    setAddLoading(true);
    try {
      const response = await api.registerMemberInChurch({
        name: addForm.name, email: addForm.email,
        password: addForm.password, confirmPassword: addForm.confirmPassword,
        churchId, age: addForm.age ? parseInt(addForm.age) : undefined,
        title: addForm.title || undefined, location: addForm.location || undefined,
      });
      if (response.success) {
        UIkit.notification({ message: 'Membro cadastrado!', status: 'success', pos: 'top-right' });
        setAddForm({ ...emptyAddForm });
        setShowAddModal(false);
        loadAll();
      }
    } catch (err: any) {
      UIkit.notification({ message: err.message || 'Erro ao cadastrar', status: 'danger', pos: 'top-right' });
    } finally {
      setAddLoading(false);
    }
  };

  const openEdit = (member: Member) => {
    setEditingMember(member);
    setEditForm({ name: member.name || '', title: member.title || '', location: member.location || '', age: member.age != null ? String(member.age) : '' });
    setShowEditModal(true);
  };

  const handleEditChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setEditForm(prev => ({ ...prev, [name]: value }));
  };

  const handleEditSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingMember) return;
    setEditLoading(true);
    try {
      const response = await api.updateChurchMember(churchId, editingMember.id, {
        name: editForm.name, title: editForm.title,
        location: editForm.location, age: editForm.age ? parseInt(editForm.age) : null,
      });
      if (response.success) {
        UIkit.notification({ message: 'Membro atualizado!', status: 'success', pos: 'top-right' });
        setShowEditModal(false); setEditingMember(null); loadAll();
      }
    } catch (err: any) {
      UIkit.notification({ message: err.message || 'Erro ao atualizar', status: 'danger', pos: 'top-right' });
    } finally {
      setEditLoading(false);
    }
  };

  const handleDelete = async (memberId: string) => {
    setDeleteLoading(true);
    try {
      const response = await api.removeMemberFromChurch(churchId, memberId);
      if (response.success) {
        UIkit.notification({ message: 'Membro removido!', status: 'success', pos: 'top-right' });
        setDeletingMemberId(null); loadAll();
      }
    } catch (err: any) {
      UIkit.notification({ message: err.message || 'Erro ao remover', status: 'danger', pos: 'top-right' });
    } finally {
      setDeleteLoading(false);
    }
  };

  const getRoleBadge = (role: string) => {
    switch (role) {
      case 'admin': return { cls: 'uk-label-danger', label: 'Admin' };
      case 'leader': return { cls: 'uk-label-warning', label: 'Líder' };
      default: return { cls: 'uk-label-info', label: 'Membro' };
    }
  };

  return (
    <div>
      {/* Header */}
      <PageHeader
        icon="users"
        title="Membros"
        subtitle="Conheça os irmãos que fazem parte desta comunidade"
        actions={isLeaderOrAdmin && (
          <button className="uk-button uk-button-primary" onClick={() => setShowAddModal(true)}>
            <span uk-icon="icon: plus; ratio: 0.85"></span>
            Novo Membro
          </button>
        )}
      />

      {/* Engagement legend */}
      {isLeaderOrAdmin && !loading && members.length > 0 && (
        <div style={{ display: 'flex', gap: '16px', marginBottom: '16px', padding: '10px 16px', border: '1px solid var(--border)', borderRadius: 'var(--radius)', background: 'var(--bg-surface)', fontSize: '11px', color: 'var(--text-muted)', flexWrap: 'wrap', alignItems: 'center' }}>
          <span style={{ fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.06em' }}>Engajamento:</span>
          {[{ color: 'var(--success)', label: 'Alto ≥30%' }, { color: 'var(--accent)', label: 'Médio ≥15%' }, { color: 'var(--text-muted)', label: 'Baixo ≥5%' }, { color: 'var(--text-faint)', label: 'Inativo <5%' }].map(({ color, label }) => (
            <span key={label} style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
              <span style={{ width: '8px', height: '8px', borderRadius: '50%', background: color, display: 'inline-block' }}></span>
              {label}
            </span>
          ))}
          <span style={{ marginLeft: 'auto', color: 'var(--text-faint)' }}>p = posts · c = comentários · m = mensagens</span>
        </div>
      )}

      {loading ? (
        <div style={{ textAlign: 'center', padding: '60px 0' }}>
          <span uk-spinner="ratio: 2"></span>
        </div>
      ) : members.length === 0 ? (
        <EmptyState icon="users" title="Nenhum membro cadastrado" text={isLeaderOrAdmin ? 'Clique em "Novo Membro" para começar' : undefined} />
      ) : (
        <div className="card" style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead>
              <tr style={{ background: 'var(--bg-surface)', borderBottom: '1px solid var(--border-strong)' }}>
                {['', 'Nome', 'E-mail', 'Cargo', 'Função', ...(isLeaderOrAdmin ? ['Engajamento'] : []), 'Ações'].map(h => (
                  <th key={h} style={{ padding: '10px 12px', textAlign: h === 'Ações' || h === '' ? 'center' : 'left', fontSize: '11px', fontWeight: 700, letterSpacing: '0.06em', textTransform: 'uppercase', color: 'var(--text-muted)', whiteSpace: 'nowrap' }}>
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="stagger">
              {members.map((m) => {
                const badge = getRoleBadge(m.role);
                return (
                  <tr key={m.id} style={{ borderBottom: '1px solid var(--border)' }}
                    onMouseEnter={(e) => (e.currentTarget.style.background = 'var(--bg-surface)')}
                    onMouseLeave={(e) => (e.currentTarget.style.background = 'transparent')}
                  >
                    <td style={{ padding: '10px 12px' }}>
                      <Avatar name={m.name} profileImage={m.profileImage} size="small" />
                    </td>
                    <td style={{ padding: '10px 12px', fontWeight: 600, color: 'var(--text)', fontSize: '13px' }}>{m.name}</td>
                    <td style={{ padding: '10px 12px', color: 'var(--text-muted)', fontSize: '13px' }}>{m.email}</td>
                    <td style={{ padding: '10px 12px', color: 'var(--text-muted)', fontSize: '13px' }}>{m.title || '—'}</td>
                    <td style={{ padding: '10px 12px' }}>
                      <span className={`uk-label ${badge.cls}`}>{badge.label}</span>
                    </td>
                    {isLeaderOrAdmin && (
                      <td style={{ padding: '10px 12px' }}>
                        <EngagementBar stat={stats[m.id]} />
                      </td>
                    )}
                    <td style={{ padding: '10px 12px', textAlign: 'center' }}>
                      {isLeaderOrAdmin && deletingMemberId === m.id ? (
                        <div style={{ display: 'flex', alignItems: 'center', gap: '6px', justifyContent: 'center' }}>
                          <span style={{ fontSize: '11px', color: 'var(--text-muted)', whiteSpace: 'nowrap' }}>Confirmar?</span>
                          <button className="uk-button uk-button-danger uk-button-small" onClick={() => handleDelete(m.id)} disabled={deleteLoading}>
                            {deleteLoading ? '...' : 'Sim'}
                          </button>
                          <button className="uk-button uk-button-default uk-button-small" onClick={() => setDeletingMemberId(null)}>
                            Não
                          </button>
                        </div>
                      ) : (
                        <div style={{ display: 'flex', gap: '5px', justifyContent: 'center', alignItems: 'center' }}>
                          <Link to={`/profile/${m.id}`} title="Ver perfil" className="action-btn">
                            <span uk-icon="icon: search; ratio: 0.75"></span>
                          </Link>
                          {isLeaderOrAdmin && (
                            <button onClick={() => openEdit(m)} title="Editar" className="action-btn">
                              <span uk-icon="icon: pencil; ratio: 0.75"></span>
                            </button>
                          )}
                          {isLeaderOrAdmin && m.id !== user?.id && (
                            <button onClick={() => setDeletingMemberId(m.id)} title="Remover" className="action-btn danger">
                              <span uk-icon="icon: trash; ratio: 0.75"></span>
                            </button>
                          )}
                        </div>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      {/* ADD MODAL */}
      {showAddModal && (
        <div className="modal-overlay" onClick={(e) => { if (e.target === e.currentTarget) setShowAddModal(false); }}>
          <div className="modal-box" style={{ maxWidth: '600px' }}>
            <div className="modal-header">
              <h4>Novo Membro</h4>
              <button className="modal-close-btn" onClick={() => setShowAddModal(false)}>
                <span uk-icon="icon: close; ratio: 0.9"></span>
              </button>
            </div>
            <form onSubmit={handleAddSubmit}>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', marginBottom: '12px' }}>
                {[
                  { label: 'Nome *', name: 'name', type: 'text', placeholder: 'Nome completo' },
                  { label: 'Email *', name: 'email', type: 'email', placeholder: 'email@exemplo.com' },
                  { label: 'Senha *', name: 'password', type: 'password', placeholder: '8+ caracteres, Aa e número' },
                  { label: 'Confirmar Senha *', name: 'confirmPassword', type: 'password', placeholder: 'Confirme a senha' },
                  { label: 'Idade', name: 'age', type: 'number', placeholder: 'Ex: 25' },
                  { label: 'Título / Função', name: 'title', type: 'text', placeholder: 'Ex: Diácono' },
                ].map(f => (
                  <div key={f.name}>
                    <label className="form-label">{f.label}</label>
                    <input className="form-input" type={f.type} name={f.name} placeholder={f.placeholder}
                      value={(addForm as any)[f.name]} onChange={handleAddChange}
                      required={f.label.endsWith('*')} />
                  </div>
                ))}
              </div>
              <div style={{ marginBottom: '20px' }}>
                <label className="form-label">Localização</label>
                <input className="form-input" type="text" name="location" placeholder="Ex: Lisboa"
                  value={addForm.location} onChange={handleAddChange} />
              </div>
              <div className="form-btn-row">
                <button type="button" className="form-btn" onClick={() => setShowAddModal(false)}>Cancelar</button>
                <button type="submit" className="form-btn primary" disabled={addLoading}>
                  {addLoading ? 'Cadastrando...' : <><span uk-icon="icon: check; ratio: 0.8"></span> Cadastrar</>}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* EDIT MODAL */}
      {showEditModal && editingMember && (
        <div className="modal-overlay" onClick={(e) => { if (e.target === e.currentTarget) { setShowEditModal(false); setEditingMember(null); } }}>
          <div className="modal-box" style={{ maxWidth: '460px' }}>
            <div className="modal-header">
              <h4>Editar — {editingMember.name}</h4>
              <button className="modal-close-btn" onClick={() => { setShowEditModal(false); setEditingMember(null); }}>
                <span uk-icon="icon: close; ratio: 0.9"></span>
              </button>
            </div>
            <form onSubmit={handleEditSubmit}>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', marginBottom: '12px' }}>
                <div style={{ gridColumn: '1 / -1' }}>
                  <label className="form-label">Nome</label>
                  <input className="form-input" type="text" name="name" value={editForm.name} onChange={handleEditChange} required />
                </div>
                <div>
                  <label className="form-label">Título / Função</label>
                  <input className="form-input" type="text" name="title" placeholder="Ex: Diácono" value={editForm.title} onChange={handleEditChange} />
                </div>
                <div>
                  <label className="form-label">Idade</label>
                  <input className="form-input" type="number" name="age" placeholder="Ex: 25" value={editForm.age} onChange={handleEditChange} />
                </div>
              </div>
              <div style={{ marginBottom: '20px' }}>
                <label className="form-label">Localização</label>
                <input className="form-input" type="text" name="location" placeholder="Ex: Lisboa" value={editForm.location} onChange={handleEditChange} />
              </div>
              <div className="form-btn-row">
                <button type="button" className="form-btn" onClick={() => { setShowEditModal(false); setEditingMember(null); }}>Cancelar</button>
                <button type="submit" className="form-btn primary" disabled={editLoading}>
                  {editLoading ? 'Salvando...' : <><span uk-icon="icon: check; ratio: 0.8"></span> Guardar</>}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default Users;
