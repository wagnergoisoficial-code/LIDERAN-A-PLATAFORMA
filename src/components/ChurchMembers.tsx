import React, { useState, useEffect } from 'react';
import { api } from '../services/api';
import UIkit from 'uikit';
import Avatar from './Avatar';

interface ChurchMembersProps {
  churchId: string;
  churchName: string;
}

const emptyForm = {
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

const ChurchMembers: React.FC<ChurchMembersProps> = ({ churchId }) => {
  const [members, setMembers] = useState<any[]>([]);
  const [loadingMembers, setLoadingMembers] = useState(true);

  // Add modal
  const [showAddModal, setShowAddModal] = useState(false);
  const [addForm, setAddForm] = useState({ ...emptyForm });
  const [addLoading, setAddLoading] = useState(false);

  // Edit modal
  const [showEditModal, setShowEditModal] = useState(false);
  const [editForm, setEditForm] = useState({ name: '', title: '', location: '', age: '' });
  const [editingMember, setEditingMember] = useState<any>(null);
  const [editLoading, setEditLoading] = useState(false);

  // Delete confirmation
  const [deletingMemberId, setDeletingMemberId] = useState<string | null>(null);
  const [deleteLoading, setDeleteLoading] = useState(false);

  useEffect(() => {
    loadMembers();
  }, [churchId]);

  const loadMembers = async () => {
    setLoadingMembers(true);
    try {
      const response = await api.getChurchMembers(churchId);
      if (response.success) {
        setMembers(Array.isArray(response.data) ? response.data : response.data.users || []);
      }
    } catch (err: any) {
      console.error('Erro ao carregar membros:', err);
    } finally {
      setLoadingMembers(false);
    }
  };

  // ── ADD MEMBER ──────────────────────────────────────────────
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
        setAddForm({ ...emptyForm });
        setShowAddModal(false);
        loadMembers();
      }
    } catch (err: any) {
      UIkit.notification({ message: err.message || 'Erro ao cadastrar membro', status: 'danger', pos: 'top-right' });
    } finally {
      setAddLoading(false);
    }
  };

  // ── EDIT MEMBER ─────────────────────────────────────────────
  const openEdit = (member: any) => {
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
        loadMembers();
      }
    } catch (err: any) {
      UIkit.notification({ message: err.message || 'Erro ao atualizar membro', status: 'danger', pos: 'top-right' });
    } finally {
      setEditLoading(false);
    }
  };

  // ── DELETE MEMBER ────────────────────────────────────────────
  const handleDelete = async (memberId: string) => {
    setDeleteLoading(true);
    try {
      const response = await api.removeMemberFromChurch(churchId, memberId);
      if (response.success) {
        UIkit.notification({ message: 'Membro removido com sucesso!', status: 'success', pos: 'top-right' });
        setDeletingMemberId(null);
        loadMembers();
      }
    } catch (err: any) {
      UIkit.notification({ message: err.message || 'Erro ao remover membro', status: 'danger', pos: 'top-right' });
    } finally {
      setDeleteLoading(false);
    }
  };

  // ── RENDER ───────────────────────────────────────────────────
  return (
    <div>
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
        <h4 style={{ margin: '0', fontSize: '16px', fontWeight: '600', color: '#212529' }}>
          Membros da Comunidade
        </h4>
        <button
          onClick={() => setShowAddModal(true)}
          style={{
            padding: '8px 16px',
            backgroundColor: '#0d6efd',
            color: 'white',
            border: 'none',
            borderRadius: '6px',
            cursor: 'pointer',
            fontSize: '13px',
            fontWeight: '500',
          }}
        >
          + Novo Membro
        </button>
      </div>

      {/* Table */}
      {loadingMembers ? (
        <div style={{ padding: '20px', textAlign: 'center', color: '#6c757d' }}>
          <div uk-spinner="ratio: 0.8"></div>
        </div>
      ) : members.length > 0 ? (
        <div style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '13px' }}>
            <thead>
              <tr style={{ borderBottom: '2px solid #dee2e6', backgroundColor: '#f8f9fa' }}>
                <th style={{ padding: '12px 8px', textAlign: 'left', fontWeight: '600', color: '#6c757d' }}>Nome</th>
                <th style={{ padding: '12px 8px', textAlign: 'left', fontWeight: '600', color: '#6c757d' }}>Email</th>
                <th style={{ padding: '12px 8px', textAlign: 'left', fontWeight: '600', color: '#6c757d' }}>Função</th>
                <th style={{ padding: '12px 8px', textAlign: 'left', fontWeight: '600', color: '#6c757d' }}>Localização</th>
                <th style={{ padding: '12px 8px', textAlign: 'center', fontWeight: '600', color: '#6c757d' }}>Ações</th>
              </tr>
            </thead>
            <tbody>
              {members.map((member: any) => (
                <tr key={member.id} style={{ borderBottom: '1px solid #e9ecef' }}>
                  <td style={{ padding: '12px 8px', color: '#212529', fontWeight: '500' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                      <Avatar 
                        name={member.name} 
                        profileImage={member.profileImage}
                        size="small"
                      />
                      <span>{member.name}</span>
                    </div>
                  </td>
                  <td style={{ padding: '12px 8px', color: '#6c757d' }}>{member.email}</td>
                  <td style={{ padding: '12px 8px', color: '#6c757d' }}>{member.title || '-'}</td>
                  <td style={{ padding: '12px 8px', color: '#6c757d' }}>{member.location || '-'}</td>
                  <td style={{ padding: '12px 8px', textAlign: 'center' }}>
                    {deletingMemberId === member.id ? (
                      <div style={{ display: 'flex', alignItems: 'center', gap: '6px', justifyContent: 'center' }}>
                        <span style={{ fontSize: '12px', color: '#6c757d' }}>Confirmar remoção?</span>
                        <button
                          onClick={() => handleDelete(member.id)}
                          disabled={deleteLoading}
                          style={{
                            padding: '4px 10px',
                            backgroundColor: '#dc3545',
                            color: 'white',
                            border: 'none',
                            borderRadius: '4px',
                            cursor: 'pointer',
                            fontSize: '12px',
                            fontWeight: '600',
                          }}
                        >
                          {deleteLoading ? '...' : 'Sim'}
                        </button>
                        <button
                          onClick={() => setDeletingMemberId(null)}
                          style={{
                            padding: '4px 10px',
                            backgroundColor: '#6c757d',
                            color: 'white',
                            border: 'none',
                            borderRadius: '4px',
                            cursor: 'pointer',
                            fontSize: '12px',
                          }}
                        >
                          Não
                        </button>
                      </div>
                    ) : (
                      <div style={{ display: 'flex', gap: '6px', justifyContent: 'center' }}>
                        {/* Edit button */}
                        <button
                          onClick={() => openEdit(member)}
                          title="Editar membro"
                          style={{
                            width: '32px',
                            height: '32px',
                            border: 'none',
                            borderRadius: '6px',
                            backgroundColor: '#e8f4fd',
                            color: '#0d6efd',
                            cursor: 'pointer',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            fontSize: '14px',
                          }}
                        >
                          ✏️
                        </button>
                        {/* Delete button */}
                        <button
                          onClick={() => setDeletingMemberId(member.id)}
                          title="Remover membro"
                          style={{
                            width: '32px',
                            height: '32px',
                            border: 'none',
                            borderRadius: '6px',
                            backgroundColor: '#fde8e8',
                            color: '#dc3545',
                            cursor: 'pointer',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            fontSize: '14px',
                          }}
                        >
                          🗑️
                        </button>
                      </div>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : (
        <div style={{
          padding: '48px 24px',
          backgroundColor: '#f8f9fa',
          border: '1px solid #e9ecef',
          borderRadius: '8px',
          textAlign: 'center',
        }}>
          <div style={{ fontSize: '48px', marginBottom: '16px' }}>👥</div>
          <p style={{ fontSize: '16px', color: '#6c757d', margin: '0' }}>Nenhum membro cadastrado ainda</p>
          <p style={{ fontSize: '14px', color: '#adb5bd', margin: '8px 0 0 0' }}>
            Clique em "+ Novo Membro" para adicionar o primeiro membro
          </p>
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
                <button
                  type="button"
                  onClick={() => setShowAddModal(false)}
                  style={{
                    flex: 1, padding: '10px', backgroundColor: '#6c757d', color: 'white',
                    border: 'none', borderRadius: '6px', cursor: 'pointer', fontSize: '13px', fontWeight: '600',
                  }}
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={addLoading}
                  style={{
                    flex: 2, padding: '10px', backgroundColor: '#0d6efd', color: 'white',
                    border: 'none', borderRadius: '6px', cursor: 'pointer', fontSize: '13px', fontWeight: '600',
                  }}
                >
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
              <h4 style={{ margin: 0, fontSize: '18px', fontWeight: '700' }}>Editar Membro</h4>
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
                <button
                  type="button"
                  onClick={() => { setShowEditModal(false); setEditingMember(null); }}
                  style={{
                    flex: 1, padding: '10px', backgroundColor: '#6c757d', color: 'white',
                    border: 'none', borderRadius: '6px', cursor: 'pointer', fontSize: '13px', fontWeight: '600',
                  }}
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={editLoading}
                  style={{
                    flex: 2, padding: '10px', backgroundColor: '#0d6efd', color: 'white',
                    border: 'none', borderRadius: '6px', cursor: 'pointer', fontSize: '13px', fontWeight: '600',
                  }}
                >
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

export default ChurchMembers;
