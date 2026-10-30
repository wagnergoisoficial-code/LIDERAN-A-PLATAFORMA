import React, { useState, useEffect } from 'react';
import { api } from '../services/api';
import UIkit from 'uikit';
import Avatar from './Avatar';
import EmptyState from './EmptyState';

interface ChurchMembersProps {
  churchId: string;
  churchName: string;
}

const emptyForm = { name: '', email: '', password: '', confirmPassword: '', age: '', title: '', location: '' };

const ChurchMembers: React.FC<ChurchMembersProps> = ({ churchId }) => {
  const [members, setMembers] = useState<any[]>([]);
  const [loadingMembers, setLoadingMembers] = useState(true);
  const [showAddModal, setShowAddModal] = useState(false);
  const [addForm, setAddForm] = useState({ ...emptyForm });
  const [addLoading, setAddLoading] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [editForm, setEditForm] = useState({ name: '', title: '', location: '', age: '' });
  const [editingMember, setEditingMember] = useState<any>(null);
  const [editLoading, setEditLoading] = useState(false);
  const [deletingMemberId, setDeletingMemberId] = useState<string | null>(null);
  const [deleteLoading, setDeleteLoading] = useState(false);

  useEffect(() => { loadMembers(); }, [churchId]);

  const loadMembers = async () => {
    setLoadingMembers(true);
    try {
      const response = await api.getChurchMembers(churchId);
      if (response.success)
        setMembers(Array.isArray(response.data) ? response.data : response.data.users || []);
    } catch (err: any) {
      console.error('Erro ao carregar membros:', err);
    } finally {
      setLoadingMembers(false);
    }
  };

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
        name: addForm.name, email: addForm.email,
        password: addForm.password, confirmPassword: addForm.confirmPassword,
        churchId, age: addForm.age ? parseInt(addForm.age) : undefined,
        title: addForm.title || undefined, location: addForm.location || undefined,
      });
      if (response.success) {
        UIkit.notification({ message: 'Membro cadastrado!', status: 'success', pos: 'top-right' });
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

  const openEdit = (member: any) => {
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
        setShowEditModal(false);
        setEditingMember(null);
        loadMembers();
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
        setDeletingMemberId(null);
        loadMembers();
      }
    } catch (err: any) {
      UIkit.notification({ message: err.message || 'Erro ao remover', status: 'danger', pos: 'top-right' });
    } finally {
      setDeleteLoading(false);
    }
  };

  return (
    <div>
      {/* Header */}
      <div className="section-head">
        <span className="list-label">Membros da Comunidade</span>
        <button
          onClick={() => setShowAddModal(true)}
          className="uk-button uk-button-primary uk-button-small"
        >
          <span uk-icon="icon: plus; ratio: 0.8"></span>
          Novo Membro
        </button>
      </div>

      {loadingMembers ? (
        <div style={{ padding: '20px', textAlign: 'center' }}>
          <span uk-spinner="ratio: 0.8"></span>
        </div>
      ) : members.length > 0 ? (
        <div className="card" style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '13px' }}>
            <thead>
              <tr style={{ background: 'var(--bg-surface)', borderBottom: '1px solid var(--border-strong)' }}>
                {['Nome', 'Email', 'Cargo', 'Localização', 'Ações'].map(h => (
                  <th key={h} style={{ padding: '10px 12px', textAlign: h === 'Ações' ? 'center' : 'left', fontSize: '11px', fontWeight: 700, letterSpacing: '0.06em', textTransform: 'uppercase', color: 'var(--text-muted)' }}>
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {members.map((member: any) => (
                <tr key={member.id} style={{ borderBottom: '1px solid var(--border)' }}>
                  <td style={{ padding: '10px 12px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                      <Avatar name={member.name} profileImage={member.profileImage} size="small" />
                      <span style={{ fontWeight: 600, color: 'var(--text)' }}>{member.name}</span>
                    </div>
                  </td>
                  <td style={{ padding: '10px 12px', color: 'var(--text-muted)' }}>{member.email}</td>
                  <td style={{ padding: '10px 12px', color: 'var(--text-muted)' }}>{member.title || '—'}</td>
                  <td style={{ padding: '10px 12px', color: 'var(--text-muted)' }}>{member.location || '—'}</td>
                  <td style={{ padding: '10px 12px', textAlign: 'center' }}>
                    {deletingMemberId === member.id ? (
                      <div style={{ display: 'flex', alignItems: 'center', gap: '6px', justifyContent: 'center' }}>
                        <span style={{ fontSize: '11px', color: 'var(--text-muted)', whiteSpace: 'nowrap' }}>Confirmar remoção?</span>
                        <button
                          className="uk-button uk-button-danger uk-button-small"
                          onClick={() => handleDelete(member.id)}
                          disabled={deleteLoading}
                        >
                          {deleteLoading ? '...' : 'Sim'}
                        </button>
                        <button
                          className="uk-button uk-button-default uk-button-small"
                          onClick={() => setDeletingMemberId(null)}
                        >
                          Não
                        </button>
                      </div>
                    ) : (
                      <div style={{ display: 'flex', gap: '6px', justifyContent: 'center' }}>
                        <button onClick={() => openEdit(member)} title="Editar" className="action-btn">
                          <span uk-icon="icon: pencil; ratio: 0.8"></span>
                        </button>
                        <button onClick={() => setDeletingMemberId(member.id)} title="Remover" className="action-btn danger">
                          <span uk-icon="icon: trash; ratio: 0.8"></span>
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
        <EmptyState icon="users" title="Nenhum membro cadastrado" text='Clique em "Novo Membro" para começar' />
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
                  { label: 'Senha *', name: 'password', type: 'password', placeholder: 'Mínimo 8 caracteres', min: 8 },
                  { label: 'Confirmar Senha *', name: 'confirmPassword', type: 'password', placeholder: 'Confirme a senha', min: 8 },
                  { label: 'Idade', name: 'age', type: 'number', placeholder: 'Ex: 25' },
                  { label: 'Título / Função', name: 'title', type: 'text', placeholder: 'Ex: Diácono' },
                ].map(f => (
                  <div key={f.name}>
                    <label className="form-label">{f.label}</label>
                    <input className="form-input" type={f.type} name={f.name} placeholder={f.placeholder}
                      value={(addForm as any)[f.name]} onChange={handleAddChange} minLength={f.min}
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
                  {addLoading ? 'Cadastrando...' : <><span uk-icon="icon: check; ratio: 0.8"></span> Cadastrar Membro</>}
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
                  <input className="form-input" type="text" name="name" placeholder="Nome completo"
                    value={editForm.name} onChange={handleEditChange} required />
                </div>
                <div>
                  <label className="form-label">Título / Função</label>
                  <input className="form-input" type="text" name="title" placeholder="Ex: Diácono"
                    value={editForm.title} onChange={handleEditChange} />
                </div>
                <div>
                  <label className="form-label">Idade</label>
                  <input className="form-input" type="number" name="age" placeholder="Ex: 25"
                    value={editForm.age} onChange={handleEditChange} />
                </div>
              </div>
              <div style={{ marginBottom: '20px' }}>
                <label className="form-label">Localização</label>
                <input className="form-input" type="text" name="location" placeholder="Ex: Lisboa"
                  value={editForm.location} onChange={handleEditChange} />
              </div>
              <div className="form-btn-row">
                <button type="button" className="form-btn" onClick={() => { setShowEditModal(false); setEditingMember(null); }}>Cancelar</button>
                <button type="submit" className="form-btn primary" disabled={editLoading}>
                  {editLoading ? 'Salvando...' : <><span uk-icon="icon: check; ratio: 0.8"></span> Guardar Alterações</>}
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
