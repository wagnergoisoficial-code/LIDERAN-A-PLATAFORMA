import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { api } from '../services/api';
import { useAuth } from '../context/AuthContext';
import UIkit from 'uikit';
import Avatar from '../components/Avatar';

interface Member {
  id: string;
  name: string;
  email: string;
  role: string;
  title?: string;
  location?: string;
  age?: number;
  profileImage?: string;
}

interface MemberStat {
  userId: string;
  posts: number;
  comments: number;
  messages: number;
  total: number;
  percentage: number;
}

const emptyAddForm = {
  name: '',
  email: '',
  password: '',
  confirmPassword: '',
  age: '',
  title: '',
  location: '',
};

const inputStyle: React.CSSProperties = {
  width: '100%',
  padding: '8px 12px',
  border: '1px solid #dee2e6',
  borderRadius: '6px',
  fontSize: '13px',
  boxSizing: 'border-box',
};

const labelStyle: React.CSSProperties = {
  display: 'block',
  fontSize: '12px',
  fontWeight: '600',
  marginBottom: '6px',
  color: '#6c757d',
};

// Returns color based on engagement %
const engagementColor = (pct: number) => {
  if (pct >= 30) return '#28a745';
  if (pct >= 15) return '#fd7e14';
  if (pct >= 5)  return '#ffc107';
  return '#adb5bd';
};

const EngagementBar = ({ stat }: { stat: MemberStat | undefined }) => {
  if (!stat) {
    return <span style={{ color: '#ced4da', fontSize: '12px' }}>—</span>;
  }
  const pct = stat.percentage;
  const color = engagementColor(pct);
  return (
    <div title={`Posts: ${stat.posts} · Comentários: ${stat.comments} · Mensagens: ${stat.messages}`}
      style={{ minWidth: '110px' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
        <div style={{
          flex: 1, height: '8px', backgroundColor: '#e9ecef',
          borderRadius: '4px', overflow: 'hidden',
        }}>
          <div style={{
            width: `${pct}%`, height: '100%',
            backgroundColor: color, borderRadius: '4px',
            transition: 'width 0.4s ease',
          }} />
        </div>
        <span style={{ fontSize: '12px', fontWeight: '700', color, minWidth: '32px', textAlign: 'right' }}>
          {pct}%
        </span>
      </div>
      <div style={{ fontSize: '10px', color: '#adb5bd', marginTop: '2px' }}>
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

  // Add modal
  const [showAddModal, setShowAddModal] = useState(false);
  const [addForm, setAddForm] = useState({ ...emptyAddForm });
  const [addLoading, setAddLoading] = useState(false);

  // Edit modal
  const [showEditModal, setShowEditModal] = useState(false);
  const [editingMember, setEditingMember] = useState<Member | null>(null);
  const [editForm, setEditForm] = useState({ name: '', title: '', location: '', age: '' });
  const [editLoading, setEditLoading] = useState(false);

  // Delete inline confirm
  const [deletingMemberId, setDeletingMemberId] = useState<string | null>(null);
  const [deleteLoading, setDeleteLoading] = useState(false);

  useEffect(() => {
    loadAll();
  }, []);

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

  // ── ADD ──────────────────────────────────────────────────────
  const handleAddChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setAddForm(prev => ({ ...prev, [name]: value }));
  };

  const handleAddSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (addForm.password !== addForm.confirmPassword) {
      UIkit.notification({ message: 'As senhas não conferem', status: 'danger', pos: 'top-right' });
      return;
    }
    if (!addForm.name.trim() || !addForm.email.trim()) {
      UIkit.notification({ message: 'Nome e email são obrigatórios', status: 'danger', pos: 'top-right' });
      return;
    }
    setAddLoading(true);
    try {
      const response = await api.registerMemberInChurch({
        name: addForm.name,
        email: addForm.email,
        password: addForm.password,
        confirmPassword: addForm.confirmPassword,
        churchId,
        age: addForm.age ? parseInt(addForm.age) : undefined,
        title: addForm.title || undefined,
        location: addForm.location || undefined,
      });
      if (response.success) {
        UIkit.notification({ message: 'Membro cadastrado com sucesso!', status: 'success', pos: 'top-right' });
        setAddForm({ ...emptyAddForm });
        setShowAddModal(false);
        loadAll();
      }
    } catch (err: any) {
      UIkit.notification({ message: err.message || 'Erro ao cadastrar membro', status: 'danger', pos: 'top-right' });
    } finally {
      setAddLoading(false);
    }
  };

  // ── EDIT ─────────────────────────────────────────────────────
  const openEdit = (member: Member) => {
    setEditingMember(member);
    setEditForm({
      name: member.name || '',
      title: member.title || '',
      location: member.location || '',
      age: member.age != null ? String(member.age) : '',
    });
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
        name: editForm.name,
        title: editForm.title,
        location: editForm.location,
        age: editForm.age ? parseInt(editForm.age) : null,
      });
      if (response.success) {
        UIkit.notification({ message: 'Membro atualizado com sucesso!', status: 'success', pos: 'top-right' });
        setShowEditModal(false);
        setEditingMember(null);
        loadAll();
      }
    } catch (err: any) {
      UIkit.notification({ message: err.message || 'Erro ao atualizar membro', status: 'danger', pos: 'top-right' });
    } finally {
      setEditLoading(false);
    }
  };

  // ── DELETE ───────────────────────────────────────────────────
  const handleDelete = async (memberId: string) => {
    setDeleteLoading(true);
    try {
      const response = await api.removeMemberFromChurch(churchId, memberId);
      if (response.success) {
        UIkit.notification({ message: 'Membro removido com sucesso!', status: 'success', pos: 'top-right' });
        setDeletingMemberId(null);
        loadAll();
      }
    } catch (err: any) {
      UIkit.notification({ message: err.message || 'Erro ao remover membro', status: 'danger', pos: 'top-right' });
    } finally {
      setDeleteLoading(false);
    }
  };

  const getRoleBadge = (role: string) => {
    switch (role) {
      case 'admin': return 'uk-label-danger';
      case 'leader': return 'uk-label-warning';
      default: return 'uk-label-info';
    }
  };

  const getRoleName = (role: string) => {
    switch (role) {
      case 'admin': return 'Administrador';
      case 'leader': return 'Líder';
      default: return 'Membro';
    }
  };

  return (
    <div>
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
        <div>
          <h2 className="uk-text-bold" style={{ margin: '0 0 4px 0' }}>Membros da Igreja</h2>
          <p className="uk-text-muted" style={{ margin: 0 }}>Conheça os irmãos que fazem parte desta comunidade.</p>
        </div>
        {isLeaderOrAdmin && (
          <button
            onClick={() => setShowAddModal(true)}
            style={{
              padding: '10px 20px',
              backgroundColor: '#0d6efd',
              color: 'white',
              border: 'none',
              borderRadius: '6px',
              cursor: 'pointer',
              fontSize: '14px',
              fontWeight: '600',
              whiteSpace: 'nowrap',
            }}
          >
            + Novo Membro
          </button>
        )}
      </div>

      {/* Legend for leaders */}
      {isLeaderOrAdmin && !loading && members.length > 0 && (
        <div style={{
          display: 'flex', gap: '16px', marginBottom: '16px',
          padding: '10px 16px', backgroundColor: '#f8f9fa',
          borderRadius: '6px', border: '1px solid #e9ecef',
          fontSize: '12px', color: '#6c757d', flexWrap: 'wrap',
          alignItems: 'center',
        }}>
          <span style={{ fontWeight: '600' }}>Engajamento:</span>
          <span><span style={{ color: '#28a745', fontWeight: 700 }}>●</span> Alto ≥30%</span>
          <span><span style={{ color: '#fd7e14', fontWeight: 700 }}>●</span> Médio ≥15%</span>
          <span><span style={{ color: '#ffc107', fontWeight: 700 }}>●</span> Baixo ≥5%</span>
          <span><span style={{ color: '#adb5bd', fontWeight: 700 }}>●</span> Inativo &lt;5%</span>
          <span style={{ marginLeft: 'auto', color: '#adb5bd' }}>p = posts · c = comentários · m = mensagens</span>
        </div>
      )}

      {/* Table */}
      {loading ? (
        <div className="uk-text-center uk-margin-large-top">
          <span uk-spinner="ratio: 2"></span>
        </div>
      ) : members.length === 0 ? (
        <div style={{
          padding: '48px 24px', backgroundColor: '#f8f9fa',
          border: '1px solid #e9ecef', borderRadius: '8px', textAlign: 'center',
        }}>
          <div style={{ fontSize: '48px', marginBottom: '16px' }}>👥</div>
          <p style={{ fontSize: '16px', color: '#6c757d', margin: 0 }}>Nenhum membro cadastrado ainda</p>
          {isLeaderOrAdmin && (
            <p style={{ fontSize: '14px', color: '#adb5bd', margin: '8px 0 0 0' }}>
              Clique em "+ Novo Membro" para adicionar o primeiro membro
            </p>
          )}
        </div>
      ) : (
        <div className="uk-card uk-card-default uk-overflow-auto">
          <table className="uk-table uk-table-hover uk-table-divider uk-table-middle">
            <thead>
              <tr>
                <th className="uk-table-shrink">Avatar</th>
                <th className="uk-table-expand">Nome</th>
                <th>E-mail</th>
                <th>Função</th>
                <th>Cargo</th>
                {isLeaderOrAdmin && (
                  <th style={{ minWidth: '140px' }}>Engajamento</th>
                )}
                <th className="uk-text-center">Ações</th>
              </tr>
            </thead>
            <tbody>
              {members.map((m) => (
                <tr key={m.id}>
                  <td>
                    <Avatar 
                      name={m.name} 
                      profileImage={m.profileImage}
                      size="small"
                    />
                  </td>
                  <td className="uk-text-bold">{m.name}</td>
                  <td>{m.email}</td>
                  <td style={{ color: '#6c757d' }}>{m.title || '-'}</td>
                  <td>
                    <span className={`uk-label uk-border-rounded ${getRoleBadge(m.role)}`}>
                      {getRoleName(m.role)}
                    </span>
                  </td>
                  {isLeaderOrAdmin && (
                    <td>
                      <EngagementBar stat={stats[m.id]} />
                    </td>
                  )}
                  <td className="uk-text-center">
                    {isLeaderOrAdmin && deletingMemberId === m.id ? (
                      <div style={{ display: 'flex', alignItems: 'center', gap: '6px', justifyContent: 'center' }}>
                        <span style={{ fontSize: '12px', color: '#6c757d', whiteSpace: 'nowrap' }}>Confirmar remoção?</span>
                        <button
                          onClick={() => handleDelete(m.id)}
                          disabled={deleteLoading}
                          style={{
                            padding: '4px 10px', backgroundColor: '#dc3545', color: 'white',
                            border: 'none', borderRadius: '4px', cursor: 'pointer', fontSize: '12px', fontWeight: '600',
                          }}
                        >
                          {deleteLoading ? '...' : 'Sim'}
                        </button>
                        <button
                          onClick={() => setDeletingMemberId(null)}
                          style={{
                            padding: '4px 10px', backgroundColor: '#6c757d', color: 'white',
                            border: 'none', borderRadius: '4px', cursor: 'pointer', fontSize: '12px',
                          }}
                        >
                          Não
                        </button>
                      </div>
                    ) : (
                      <div style={{ display: 'flex', gap: '6px', justifyContent: 'center', alignItems: 'center' }}>
                        <Link
                          to={`/profile/${m.id}`}
                          title="Ver perfil"
                          style={{
                            width: '32px', height: '32px', borderRadius: '6px',
                            backgroundColor: '#e9ecef', color: '#495057',
                            display: 'flex', alignItems: 'center', justifyContent: 'center',
                            textDecoration: 'none', fontSize: '14px',
                          }}
                        >
                          <span uk-icon="icon: search; ratio: 0.8"></span>
                        </Link>
                        {isLeaderOrAdmin && (
                          <button
                            onClick={() => openEdit(m)}
                            title="Editar membro"
                            style={{
                              width: '32px', height: '32px', border: 'none', borderRadius: '6px',
                              backgroundColor: '#e8f4fd', color: '#0d6efd',
                              cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center',
                              fontSize: '14px',
                            }}
                          >
                            ✏️
                          </button>
                        )}
                        {isLeaderOrAdmin && m.id !== user?.id && (
                          <button
                            onClick={() => setDeletingMemberId(m.id)}
                            title="Remover membro"
                            style={{
                              width: '32px', height: '32px', border: 'none', borderRadius: '6px',
                              backgroundColor: '#fde8e8', color: '#dc3545',
                              cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center',
                              fontSize: '14px',
                            }}
                          >
                            🗑️
                          </button>
                        )}
                      </div>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* ── ADD MODAL ── */}
      {showAddModal && (
        <div
          onClick={(e) => { if (e.target === e.currentTarget) setShowAddModal(false); }}
          style={{
            position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
            backgroundColor: 'rgba(0,0,0,0.5)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            zIndex: 2000,
          }}
        >
          <div style={{
            backgroundColor: 'white', borderRadius: '10px', padding: '28px',
            width: '90%', maxWidth: '620px', maxHeight: '90vh', overflowY: 'auto',
            boxShadow: '0 10px 40px rgba(0,0,0,0.2)',
          }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
              <h4 style={{ margin: 0, fontSize: '18px', fontWeight: '700' }}>Novo Membro</h4>
              <button
                onClick={() => setShowAddModal(false)}
                style={{ background: 'none', border: 'none', fontSize: '20px', cursor: 'pointer', color: '#6c757d' }}
              >
                ✕
              </button>
            </div>
            <form onSubmit={handleAddSubmit}>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', marginBottom: '12px' }}>
                <div>
                  <label style={labelStyle}>Nome *</label>
                  <input style={inputStyle} type="text" name="name" placeholder="Nome completo"
                    value={addForm.name} onChange={handleAddChange} required />
                </div>
                <div>
                  <label style={labelStyle}>Email *</label>
                  <input style={inputStyle} type="email" name="email" placeholder="email@exemplo.com"
                    value={addForm.email} onChange={handleAddChange} required />
                </div>
                <div>
                  <label style={labelStyle}>Senha *</label>
                  <input style={inputStyle} type="password" name="password" placeholder="Mínimo 8 caracteres"
                    value={addForm.password} onChange={handleAddChange} required minLength={8} />
                </div>
                <div>
                  <label style={labelStyle}>Confirmar Senha *</label>
                  <input style={inputStyle} type="password" name="confirmPassword" placeholder="Confirme a senha"
                    value={addForm.confirmPassword} onChange={handleAddChange} required minLength={8} />
                </div>
                <div>
                  <label style={labelStyle}>Idade</label>
                  <input style={inputStyle} type="number" name="age" placeholder="Ex: 25"
                    value={addForm.age} onChange={handleAddChange} />
                </div>
                <div>
                  <label style={labelStyle}>Título/Função</label>
                  <input style={inputStyle} type="text" name="title" placeholder="Ex: Diácono"
                    value={addForm.title} onChange={handleAddChange} />
                </div>
              </div>
              <div style={{ marginBottom: '20px' }}>
                <label style={labelStyle}>Localização</label>
                <input style={inputStyle} type="text" name="location" placeholder="Ex: Lisboa"
                  value={addForm.location} onChange={handleAddChange} />
              </div>
              <div style={{ display: 'flex', gap: '10px' }}>
                <button type="button" onClick={() => setShowAddModal(false)}
                  style={{ flex: 1, padding: '10px', backgroundColor: '#6c757d', color: 'white', border: 'none', borderRadius: '6px', cursor: 'pointer', fontSize: '13px', fontWeight: '600' }}>
                  Cancelar
                </button>
                <button type="submit" disabled={addLoading}
                  style={{ flex: 2, padding: '10px', backgroundColor: '#0d6efd', color: 'white', border: 'none', borderRadius: '6px', cursor: 'pointer', fontSize: '13px', fontWeight: '600' }}>
                  {addLoading ? 'A cadastrar...' : '✓ Cadastrar Membro'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ── EDIT MODAL ── */}
      {showEditModal && editingMember && (
        <div
          onClick={(e) => { if (e.target === e.currentTarget) { setShowEditModal(false); setEditingMember(null); } }}
          style={{
            position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
            backgroundColor: 'rgba(0,0,0,0.5)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            zIndex: 2000,
          }}
        >
          <div style={{
            backgroundColor: 'white', borderRadius: '10px', padding: '28px',
            width: '90%', maxWidth: '480px', boxShadow: '0 10px 40px rgba(0,0,0,0.2)',
          }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
              <h4 style={{ margin: 0, fontSize: '18px', fontWeight: '700' }}>
                Editar — {editingMember.name}
              </h4>
              <button
                onClick={() => { setShowEditModal(false); setEditingMember(null); }}
                style={{ background: 'none', border: 'none', fontSize: '20px', cursor: 'pointer', color: '#6c757d' }}
              >
                ✕
              </button>
            </div>
            <form onSubmit={handleEditSubmit}>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', marginBottom: '12px' }}>
                <div style={{ gridColumn: '1 / -1' }}>
                  <label style={labelStyle}>Nome</label>
                  <input style={inputStyle} type="text" name="name" placeholder="Nome completo"
                    value={editForm.name} onChange={handleEditChange} required />
                </div>
                <div>
                  <label style={labelStyle}>Título/Função</label>
                  <input style={inputStyle} type="text" name="title" placeholder="Ex: Diácono"
                    value={editForm.title} onChange={handleEditChange} />
                </div>
                <div>
                  <label style={labelStyle}>Idade</label>
                  <input style={inputStyle} type="number" name="age" placeholder="Ex: 25"
                    value={editForm.age} onChange={handleEditChange} />
                </div>
              </div>
              <div style={{ marginBottom: '20px' }}>
                <label style={labelStyle}>Localização</label>
                <input style={inputStyle} type="text" name="location" placeholder="Ex: Lisboa"
                  value={editForm.location} onChange={handleEditChange} />
              </div>
              <div style={{ display: 'flex', gap: '10px' }}>
                <button type="button" onClick={() => { setShowEditModal(false); setEditingMember(null); }}
                  style={{ flex: 1, padding: '10px', backgroundColor: '#6c757d', color: 'white', border: 'none', borderRadius: '6px', cursor: 'pointer', fontSize: '13px', fontWeight: '600' }}>
                  Cancelar
                </button>
                <button type="submit" disabled={editLoading}
                  style={{ flex: 2, padding: '10px', backgroundColor: '#0d6efd', color: 'white', border: 'none', borderRadius: '6px', cursor: 'pointer', fontSize: '13px', fontWeight: '600' }}>
                  {editLoading ? 'A guardar...' : '✓ Guardar Alterações'}
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
