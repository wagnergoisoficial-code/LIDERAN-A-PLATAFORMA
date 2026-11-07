import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import UIkit from 'uikit';
import { api } from '../services/api';
import { useAuth } from '../context/AuthContext';
import { plural } from '../lib/format';
import Avatar from '../components/Avatar';
import Icon from '../components/Icon';
import Modal from '../components/Modal';
import MoreMenu, { MenuAction } from '../components/MoreMenu';
import PageHeader from '../components/PageHeader';
import EmptyState from '../components/EmptyState';
import { CommunityTabs } from '../components/SectionTabs';
import GuardianFields, { EMPTY_GUARDIAN, GuardianDraft, guardianPayload, isMinorDate, todayInput } from '../components/GuardianFields';

interface Member {
  id: string; name: string; email: string; role: string;
  title?: string; location?: string; age?: number; profileImage?: string; birthDate?: string | null;
}

interface MemberStat {
  userId: string; posts: number; comments: number; messages: number;
  total: number; percentage: number;
}

const emptyAddForm = { name: '', email: '', password: '', confirmPassword: '', birthDate: '', title: '', location: '' };
const notify = (message: string, status: 'success' | 'danger' = 'danger') => UIkit.notification({ message, status, pos: 'top-right' });

const ADD_FIELDS = [
  { label: 'Nome', name: 'name', type: 'text', placeholder: 'Nome completo', required: true, autoComplete: 'off' },
  { label: 'E-mail', name: 'email', type: 'email', placeholder: 'email@exemplo.com', required: true, autoComplete: 'off' },
  { label: 'Senha', name: 'password', type: 'password', placeholder: '8+ caracteres, maiúscula e número', required: true, autoComplete: 'new-password' },
  { label: 'Confirmar senha', name: 'confirmPassword', type: 'password', placeholder: 'Repita a senha', required: true, autoComplete: 'new-password' },
  { label: 'Data de nascimento', name: 'birthDate', type: 'date', placeholder: '', required: true, autoComplete: 'off' },
  { label: 'Título ou função', name: 'title', type: 'text', placeholder: 'Ex.: Diácono', required: false, autoComplete: 'off' },
];

const Users = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const isLeaderOrAdmin = user?.role === 'leader' || user?.role === 'admin';
  const churchId = user?.churchId || '';

  const [members, setMembers] = useState<Member[]>([]);
  const [stats, setStats] = useState<Record<string, MemberStat>>({});
  const [loading, setLoading] = useState(true);
  const [query, setQuery] = useState('');
  const [showAddModal, setShowAddModal] = useState(false);
  const [addForm, setAddForm] = useState({ ...emptyAddForm });
  const [guardian, setGuardian] = useState<GuardianDraft>({ ...EMPTY_GUARDIAN });
  const [addLoading, setAddLoading] = useState(false);
  const [editingMember, setEditingMember] = useState<Member | null>(null);
  const [editForm, setEditForm] = useState({ name: '', title: '', location: '', birthDate: '' });
  const [editLoading, setEditLoading] = useState(false);

  const loadAll = async () => {
    try {
      const [membersRes, statsRes] = await Promise.all([
        api.getUsers(),
        churchId && isLeaderOrAdmin ? api.getChurchMemberStats(churchId) : Promise.resolve({ success: false, data: [] }),
      ]);
      if (membersRes.success) setMembers(membersRes.data || []);
      if (statsRes.success && Array.isArray(statsRes.data)) {
        const map: Record<string, MemberStat> = {};
        statsRes.data.forEach((s: MemberStat) => { map[s.userId] = s; });
        setStats(map);
      }
    } catch {
      notify('Não foi possível carregar os membros');
    } finally {
      setLoading(false);
    }
  };

  // eslint-disable-next-line react-hooks/exhaustive-deps
  useEffect(() => { loadAll(); }, []);

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
        setAddForm({ ...emptyAddForm });
        setGuardian({ ...EMPTY_GUARDIAN });
        setShowAddModal(false);
        loadAll();
      }
    } catch (err: any) {
      notify(err.message || 'Não foi possível cadastrar');
    } finally {
      setAddLoading(false);
    }
  };

  const openEdit = (member: Member) => {
    setEditingMember(member);
    setEditForm({ name: member.name || '', title: member.title || '', location: member.location || '', birthDate: member.birthDate ? String(member.birthDate).slice(0, 10) : '' });
  };

  const handleEditSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingMember) return;
    setEditLoading(true);
    try {
      const response = await api.updateChurchMember(churchId, editingMember.id, {
        name: editForm.name, title: editForm.title,
        location: editForm.location, birthDate: editForm.birthDate || null,
      });
      if (response.success) {
        notify('Dados atualizados', 'success');
        setEditingMember(null);
        loadAll();
      }
    } catch (err: any) {
      notify(err.message || 'Não foi possível atualizar');
    } finally {
      setEditLoading(false);
    }
  };

  const handleDelete = async (member: Member) => {
    if (!confirm(`Remover ${member.name} da comunidade?`)) return;
    try {
      const response = await api.removeMemberFromChurch(churchId, member.id);
      if (response.success) {
        notify('Membro removido', 'success');
        loadAll();
      }
    } catch (err: any) {
      notify(err.message || 'Não foi possível remover');
    }
  };

  const message = async (memberId: string) => {
    try {
      const res = await api.startConversation(memberId);
      navigate(`/messages?c=${res.data.id}`);
    } catch (err: any) {
      notify(err.message || 'Não foi possível abrir a conversa');
    }
  };

  const filtered = members.filter(m => `${m.name} ${m.title || ''} ${m.location || ''}`.toLowerCase().includes(query.trim().toLowerCase()));

  return (
    <div className="page is-medium">
      <CommunityTabs />
      <PageHeader
        title="Membros"
        subtitle={loading ? 'Pessoas da comunidade' : `${plural(members.length, 'pessoa', 'pessoas')} na comunidade`}
        actions={isLeaderOrAdmin && (
          <button type="button" className="uk-button uk-button-primary" onClick={() => setShowAddModal(true)}>
            <Icon name="user-plus" size={18} /> Novo membro
          </button>
        )}
      />

      <div style={{ marginBottom: '12px' }}>
        <label className="visually-hidden" htmlFor="member-search">Buscar membro</label>
        <input id="member-search" className="form-input" type="search" placeholder="Buscar por nome, função ou cidade" value={query} onChange={e => setQuery(e.target.value)} />
      </div>

      {loading ? (
        <div className="loading-block" role="status" aria-label="Carregando membros"><span uk-spinner="ratio: 1"></span></div>
      ) : members.length === 0 ? (
        <div className="card">
          <EmptyState icon="users" title="Ainda não há membros" text={isLeaderOrAdmin ? 'Cadastre os jovens ou envie o link de convite que está no Painel do líder.' : undefined} />
        </div>
      ) : filtered.length === 0 ? (
        <div className="card"><p className="list-empty">Ninguém encontrado com “{query.trim()}”.</p></div>
      ) : (
        <div className="card stagger">
          {filtered.map(m => {
            const stat = stats[m.id];
            const isMe = m.id === user?.id;
            const actions: MenuAction[] = isLeaderOrAdmin ? [
              { label: 'Editar dados', icon: 'pencil', onSelect: () => openEdit(m) },
              ...(!isMe ? [{ label: 'Remover da comunidade', icon: 'trash' as const, danger: true, onSelect: () => handleDelete(m) }] : []),
            ] : [];
            return (
              <div key={m.id} className="list-row">
                <Link to={`/profile/${m.id}`} tabIndex={-1} aria-hidden="true"><Avatar name={m.name} profileImage={m.profileImage} size={44} /></Link>
                <span className="list-row-body">
                  <span className="list-row-title">
                    <Link to={`/profile/${m.id}`} className="truncate" style={{ color: 'var(--text)' }}>{m.name}{isMe ? ' (você)' : ''}</Link>
                    {(m.role === 'leader' || m.role === 'admin') && <span className="tag">{m.role === 'admin' ? 'Admin' : 'Líder'}</span>}
                  </span>
                  <span className="list-row-meta" style={{ display: 'block' }}>
                    {[m.title, m.location].filter(Boolean).join(' · ') || (isLeaderOrAdmin ? m.email : 'Membro')}
                  </span>
                  {isLeaderOrAdmin && (
                    <span className="list-row-meta" style={{ display: 'block', color: 'var(--text-faint)' }}>
                      {(m.title || m.location) ? `${m.email} · ` : ''}
                      {stat ? `${plural(stat.posts, 'publicação', 'publicações')}, ${plural(stat.comments, 'comentário', 'comentários')}, ${plural(stat.messages, 'mensagem', 'mensagens')}` : 'Sem participação ainda'}
                    </span>
                  )}
                </span>
                <span className="list-row-aside">
                  {!isMe && (
                    <button type="button" className="action-btn" aria-label={`Enviar mensagem para ${m.name}`} title="Enviar mensagem" onClick={() => message(m.id)}>
                      <Icon name="messages" />
                    </button>
                  )}
                  <MoreMenu actions={actions} label={`Opções de ${m.name}`} />
                </span>
              </div>
            );
          })}
        </div>
      )}

      {showAddModal && (
        <Modal title="Novo membro" onClose={() => setShowAddModal(false)} width={600} onSubmit={handleAddSubmit}>
          <div className="form-grid">
            {ADD_FIELDS.map((f, i) => (
              <div key={f.name}>
                <label className="form-label" htmlFor={`add-${f.name}`}>{f.label}{!f.required && <span className="faint" style={{ fontWeight: 400 }}> (opcional)</span>}</label>
                <input id={`add-${f.name}`} className="form-input" type={f.type} name={f.name} placeholder={f.placeholder} autoComplete={f.autoComplete}
                  value={(addForm as any)[f.name]} onChange={e => setAddForm(prev => ({ ...prev, [f.name]: e.target.value }))}
                  max={f.type === 'date' ? todayInput() : undefined} minLength={f.type === 'password' ? 8 : undefined}
                  required={f.required} {...(i === 0 ? { 'data-autofocus': true } : {})} />
              </div>
            ))}
            <div className="is-wide">
              <label className="form-label" htmlFor="add-location">Localização <span className="faint" style={{ fontWeight: 400 }}>(opcional)</span></label>
              <input id="add-location" className="form-input" type="text" placeholder="Ex.: Matola" value={addForm.location}
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
              {addLoading ? <><span uk-spinner="ratio: 0.5"></span> Cadastrando…</> : 'Cadastrar'}
            </button>
          </div>
        </Modal>
      )}

      {editingMember && (
        <Modal title={`Editar ${editingMember.name}`} onClose={() => setEditingMember(null)} width={480} onSubmit={handleEditSubmit}>
          <div className="form-grid">
            <div className="is-wide">
              <label className="form-label" htmlFor="edit-name">Nome</label>
              <input id="edit-name" className="form-input" type="text" value={editForm.name} data-autofocus onChange={e => setEditForm(prev => ({ ...prev, name: e.target.value }))} required />
            </div>
            <div>
              <label className="form-label" htmlFor="edit-title">Título ou função</label>
              <input id="edit-title" className="form-input" type="text" placeholder="Ex.: Diácono" value={editForm.title} onChange={e => setEditForm(prev => ({ ...prev, title: e.target.value }))} />
            </div>
            <div>
              <label className="form-label" htmlFor="edit-birth">Data de nascimento</label>
              <input id="edit-birth" className="form-input" type="date" max={todayInput()} value={editForm.birthDate} onChange={e => setEditForm(prev => ({ ...prev, birthDate: e.target.value }))} />
            </div>
            <div className="is-wide">
              <label className="form-label" htmlFor="edit-location">Localização</label>
              <input id="edit-location" className="form-input" type="text" placeholder="Ex.: Matola" value={editForm.location} onChange={e => setEditForm(prev => ({ ...prev, location: e.target.value }))} />
            </div>
          </div>
          <div className="form-btn-row">
            <button type="button" className="form-btn" onClick={() => setEditingMember(null)}>Cancelar</button>
            <button type="submit" className="form-btn primary" disabled={editLoading}>
              {editLoading ? <><span uk-spinner="ratio: 0.5"></span> Salvando…</> : 'Salvar'}
            </button>
          </div>
        </Modal>
      )}
    </div>
  );
};

export default Users;
