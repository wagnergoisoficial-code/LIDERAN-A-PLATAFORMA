import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import UIkit from 'uikit';
import { api } from '../services/api';
import Avatar from './Avatar';
import Icon from './Icon';
import Modal from './Modal';
import MoreMenu from './MoreMenu';
import EmptyState from './EmptyState';
import GuardianFields, { EMPTY_GUARDIAN, GuardianDraft, guardianPayload, isMinorDate, todayInput } from './GuardianFields';
import { statusLabel } from './MemberProtection';
import { useMemberAdmin } from './MemberAdmin';

interface ChurchMembersProps {
  churchId: string;
  churchName: string;
  // Só o criador da comunidade (ou um administrador) torna alguém líder
  canChangeRoles?: boolean;
}

const emptyForm = { name: '', email: '', password: '', confirmPassword: '', birthDate: '', title: '', location: '' };
const notify = (message: string, status: 'success' | 'danger' = 'danger') => UIkit.notification({ message, status, pos: 'top-right' });

const ADD_FIELDS = [
  { label: 'Nome', name: 'name', type: 'text', placeholder: 'Nome completo', required: true, autoComplete: 'off' },
  { label: 'E-mail', name: 'email', type: 'email', placeholder: 'email@exemplo.com', required: true, autoComplete: 'off' },
  { label: 'Senha', name: 'password', type: 'password', placeholder: '8+ caracteres, maiúscula e número', required: true, autoComplete: 'new-password' },
  { label: 'Confirmar senha', name: 'confirmPassword', type: 'password', placeholder: 'Repita a senha', required: true, autoComplete: 'new-password' },
  { label: 'Data de nascimento', name: 'birthDate', type: 'date', placeholder: '', required: true, autoComplete: 'off' },
  { label: 'Título ou função', name: 'title', type: 'text', placeholder: 'Ex.: Diácono', required: false, autoComplete: 'off' },
];

// Painel do líder: membros da comunidade, com cadastro, edição, proteção e remoção
const ChurchMembers: React.FC<ChurchMembersProps> = ({ churchId, canChangeRoles }) => {
  const [members, setMembers] = useState<any[]>([]);
  const [loadingMembers, setLoadingMembers] = useState(true);
  const [showAddModal, setShowAddModal] = useState(false);
  const [addForm, setAddForm] = useState({ ...emptyForm });
  const [addLoading, setAddLoading] = useState(false);
  const [guardian, setGuardian] = useState<GuardianDraft>({ ...EMPTY_GUARDIAN });

  const loadMembers = async () => {
    setLoadingMembers(true);
    try {
      const response = await api.getChurchMembers(churchId);
      if (response.success) setMembers(Array.isArray(response.data) ? response.data : response.data.users || []);
    } catch {
      notify('Não foi possível carregar os membros');
    } finally {
      setLoadingMembers(false);
    }
  };

  // eslint-disable-next-line react-hooks/exhaustive-deps
  useEffect(() => { loadMembers(); }, [churchId]);

  const handleAddSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (addForm.password !== addForm.confirmPassword) return notify('As senhas não conferem');
    setAddLoading(true);
    try {
      const response = await api.registerMemberInChurch({
        name: addForm.name, email: addForm.email,
        password: addForm.password, confirmPassword: addForm.confirmPassword,
        churchId, birthDate: addForm.birthDate,
        title: addForm.title || undefined, location: addForm.location || undefined,
        guardian: isMinorDate(addForm.birthDate) ? guardianPayload(guardian) : undefined,
      });
      if (response.success) {
        notify(response.message || 'Membro cadastrado', 'success');
        setAddForm({ ...emptyForm });
        setGuardian({ ...EMPTY_GUARDIAN });
        setShowAddModal(false);
        loadMembers();
      }
    } catch (err: any) {
      notify(err.message || 'Não foi possível cadastrar o membro');
    } finally {
      setAddLoading(false);
    }
  };

  const admin = useMemberAdmin({ churchId, canChangeRole: canChangeRoles, onChanged: loadMembers });

  const pendingCount = members.filter(m => m.status === 'pending_authorization').length;

  return (
    <section aria-labelledby="members-title">
      <div className="section-head">
        <h2 id="members-title" className="list-label">Membros{members.length ? ` · ${members.length}` : ''}</h2>
        <button type="button" onClick={() => setShowAddModal(true)} className="uk-button uk-button-primary uk-button-small">
          <Icon name="user-plus" size={16} /> Novo membro
        </button>
      </div>

      {pendingCount > 0 && (
        <p className="protected-note" style={{ marginBottom: '10px', borderRadius: 'var(--radius)' }}>
          <Icon name="lock" size={16} />
          {pendingCount === 1 ? '1 menor aguarda' : `${pendingCount} menores aguardam`} a autorização dos pais. Use “Gerir” → “Autorizar cadastro” para confirmar.
        </p>
      )}

      {loadingMembers ? (
        <div className="card loading-block"><span uk-spinner="ratio: 0.8"></span></div>
      ) : members.length === 0 ? (
        <div className="card"><EmptyState icon="users" title="Ainda não há membros" text='Toque em "Novo membro" ou envie o link de convite.' /></div>
      ) : (
        <div className="card table-scroll">
          <table className="data-table">
            <thead>
              <tr>
                <th scope="col">Nome</th>
                <th scope="col">E-mail</th>
                <th scope="col">Situação</th>
                <th scope="col"><span className="visually-hidden">Ações</span></th>
              </tr>
            </thead>
            <tbody>
              {members.map((member: any) => (
                <tr key={member.id}>
                  <td>
                    <Link to={`/profile/${member.id}`} style={{ display: 'flex', alignItems: 'center', gap: '10px', color: 'var(--text)', fontWeight: 600, minWidth: '180px' }}>
                      <Avatar name={member.name} profileImage={member.profileImage} size={32} />
                      <span>
                        {member.name}
                        {member.title && <span className="list-row-meta" style={{ display: 'block', fontWeight: 400 }}>{member.title}</span>}
                      </span>
                    </Link>
                  </td>
                  <td className="muted">{member.email}</td>
                  <td>
                    <div style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', gap: '4px' }}>
                      {member.status && member.status !== 'active'
                        ? <span className="tag">{statusLabel(member)}</span>
                        : <span className="muted">{statusLabel(member)}</span>}
                      {member.role === 'leader' && <span className="tag">Líder</span>}
                      {member.isMinor && <span className="tag">Menor</span>}
                    </div>
                  </td>
                  <td style={{ textAlign: 'right', whiteSpace: 'nowrap' }}>
                    <MoreMenu actions={admin.actionsFor(member)} buttonLabel="Gerir" label={`Gerir ${member.name}`} />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {showAddModal && (
        <Modal title="Novo membro" onClose={() => setShowAddModal(false)} width={600} onSubmit={handleAddSubmit}>
          <div className="form-grid">
            {ADD_FIELDS.map((f, i) => (
              <div key={f.name}>
                <label className="form-label" htmlFor={`member-${f.name}`}>{f.label}{!f.required && <span className="faint" style={{ fontWeight: 400 }}> (opcional)</span>}</label>
                <input id={`member-${f.name}`} className="form-input" type={f.type} name={f.name} placeholder={f.placeholder} autoComplete={f.autoComplete}
                  value={(addForm as any)[f.name]} onChange={e => setAddForm(prev => ({ ...prev, [f.name]: e.target.value }))}
                  minLength={f.type === 'password' ? 8 : undefined} max={f.type === 'date' ? todayInput() : undefined}
                  required={f.required} {...(i === 0 ? { 'data-autofocus': true } : {})} />
              </div>
            ))}
            <div className="is-wide">
              <label className="form-label" htmlFor="member-location">Localização <span className="faint" style={{ fontWeight: 400 }}>(opcional)</span></label>
              <input id="member-location" className="form-input" type="text" placeholder="Ex.: Matola" value={addForm.location}
                onChange={e => setAddForm(prev => ({ ...prev, location: e.target.value }))} />
            </div>
          </div>
          {isMinorDate(addForm.birthDate) && (
            <div style={{ marginTop: '16px' }}>
              <GuardianFields value={guardian} onChange={setGuardian} />
            </div>
          )}
          <div className="form-btn-row">
            <button type="button" className="form-btn" onClick={() => setShowAddModal(false)}>Cancelar</button>
            <button type="submit" className="form-btn primary" disabled={addLoading}>
              {addLoading ? <><span uk-spinner="ratio: 0.5"></span> Cadastrando…</> : 'Cadastrar membro'}
            </button>
          </div>
        </Modal>
      )}

      {admin.modals}
    </section>
  );
};

export default ChurchMembers;
