import React, { useState } from 'react';
import UIkit from 'uikit';
import { api } from '../services/api';
import { useAuth } from '../context/AuthContext';
import Modal from './Modal';
import { MenuAction } from './MoreMenu';
import MemberProtection, { ProtectedMember } from './MemberProtection';
import { todayInput } from './GuardianFields';

export interface ManagedMember extends ProtectedMember {
  email?: string;
  title?: string | null;
  location?: string | null;
  birthDate?: string | null;
  profileImage?: string | null;
}

const notify = (message: string, status: 'success' | 'danger' = 'danger') => UIkit.notification({ message, status, pos: 'top-right' });

/** Editar os dados de um membro (nome, função, nascimento e localização). */
export const MemberEditModal: React.FC<{ churchId: string; member: ManagedMember; onClose: () => void; onSaved: () => void }> = ({ churchId, member, onClose, onSaved }) => {
  const [form, setForm] = useState({
    name: member.name || '',
    title: member.title || '',
    location: member.location || '',
    birthDate: member.birthDate ? String(member.birthDate).slice(0, 10) : '',
  });
  const [saving, setSaving] = useState(false);
  const set = (key: keyof typeof form) => (e: React.ChangeEvent<HTMLInputElement>) => setForm(prev => ({ ...prev, [key]: e.target.value }));

  const save = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    try {
      await api.updateChurchMember(churchId, member.id, { ...form, birthDate: form.birthDate || null });
      notify('Dados atualizados', 'success');
      onSaved();
    } catch (err: any) {
      notify(err.message || 'Não foi possível atualizar');
    } finally {
      setSaving(false);
    }
  };

  return (
    <Modal title={`Editar ${member.name}`} onClose={onClose} width={480} onSubmit={save}>
      <div className="form-grid">
        <div className="is-wide">
          <label className="form-label" htmlFor="admin-name">Nome</label>
          <input id="admin-name" className="form-input" type="text" value={form.name} onChange={set('name')} required data-autofocus />
        </div>
        <div>
          <label className="form-label" htmlFor="admin-title">Título ou função</label>
          <input id="admin-title" className="form-input" type="text" placeholder="Ex.: Diácono" value={form.title} onChange={set('title')} />
        </div>
        <div>
          <label className="form-label" htmlFor="admin-birth">Data de nascimento</label>
          <input id="admin-birth" className="form-input" type="date" max={todayInput()} value={form.birthDate} onChange={set('birthDate')} />
        </div>
        <div className="is-wide">
          <label className="form-label" htmlFor="admin-location">Localização</label>
          <input id="admin-location" className="form-input" type="text" placeholder="Ex.: Matola" value={form.location} onChange={set('location')} />
        </div>
      </div>
      <div className="form-btn-row">
        <button type="button" className="form-btn" onClick={onClose}>Cancelar</button>
        <button type="submit" className="form-btn primary" disabled={saving}>
          {saving ? <><span uk-spinner="ratio: 0.5"></span> Salvando…</> : 'Salvar'}
        </button>
      </div>
    </Modal>
  );
};

// O que o líder pode fazer com a conta, dito pelo estado dela
const accessLabel = (member: ManagedMember) =>
  member.status === 'pending_authorization' ? 'Autorizar cadastro'
    : member.status === 'suspended' || member.status === 'blocked' ? 'Reativar ou bloquear'
    : 'Suspender ou bloquear';

interface Options {
  churchId: string;
  // Só o criador da comunidade (ou um administrador) torna alguém líder
  canChangeRole?: boolean;
  // Secretaria: só editar os dados
  editOnly?: boolean;
  // Depois de editar, suspender, tornar líder ou remover: a página recarrega os dados
  onChanged: () => void;
}

/**
 * Poderes do líder sobre um membro: editar dados, suspender ou bloquear (por dias), reativar,
 * autorizar menores, tornar líder e remover. Devolve as ações para o menu "Gerir" e os diálogos.
 */
export const useMemberAdmin = ({ churchId, canChangeRole, editOnly, onChanged }: Options) => {
  const { user } = useAuth();
  const [editing, setEditing] = useState<ManagedMember | null>(null);
  const [protecting, setProtecting] = useState<ManagedMember | null>(null);

  const remove = async (member: ManagedMember) => {
    if (!confirm(`Remover ${member.name} da comunidade?`)) return;
    try {
      await api.removeMemberFromChurch(churchId, member.id);
      notify(`${member.name} foi removido da comunidade`, 'success');
      onChanged();
    } catch (err: any) {
      notify(err.message || 'Não foi possível remover');
    }
  };

  const changeRole = async (member: ManagedMember) => {
    const leader = member.role === 'leader';
    const question = leader
      ? `Tirar a liderança de ${member.name}? Continua membro da comunidade.`
      : `Tornar ${member.name} líder? Vai poder gerenciar os membros, ler as conversas privadas e moderar a comunidade.`;
    if (!confirm(question)) return;
    try {
      await api.setMemberRole(churchId, member.id, leader ? 'member' : 'leader');
      notify(leader ? `${member.name} deixou de ser líder` : `${member.name} agora é líder`, 'success');
      onChanged();
    } catch (err: any) {
      notify(err.message || 'Não foi possível mudar a liderança');
    }
  };

  const actionsFor = (member: ManagedMember): MenuAction[] => {
    const isMe = member.id === user?.id;
    const actions: MenuAction[] = [{ label: 'Editar dados', icon: 'pencil', onSelect: () => setEditing(member) }];
    if (isMe || editOnly) return actions;
    actions.push({ label: accessLabel(member), icon: 'shield', onSelect: () => setProtecting(member) });
    if (canChangeRole && member.role !== 'admin' && !member.isMinor && member.status === 'active') {
      actions.push({ label: member.role === 'leader' ? 'Tirar de líder' : 'Tornar líder', icon: 'user-plus', onSelect: () => changeRole(member) });
    }
    actions.push({ label: 'Remover da comunidade', icon: 'trash', danger: true, onSelect: () => remove(member) });
    return actions;
  };

  const modals = (
    <>
      {editing && (
        <MemberEditModal churchId={churchId} member={editing} onClose={() => setEditing(null)}
          onSaved={() => { setEditing(null); onChanged(); }} />
      )}
      {protecting && (
        <MemberProtection churchId={churchId} canChangeRole={canChangeRole} member={protecting}
          onClose={() => setProtecting(null)}
          onChanged={updated => { setProtecting(updated); onChanged(); }} />
      )}
    </>
  );

  return { actionsFor, modals };
};
