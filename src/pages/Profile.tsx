import React, { useState, useEffect, useRef } from 'react';
import { Link, useParams, useNavigate } from 'react-router-dom';
import UIkit from 'uikit';
import { api } from '../services/api';
import { useAuth } from '../context/AuthContext';
import { useTheme } from '../context/ThemeContext';
import { roleLabel } from '../lib/format';
import Avatar from '../components/Avatar';
import Icon from '../components/Icon';
import EmptyState from '../components/EmptyState';
import MoreMenu, { MenuAction } from '../components/MoreMenu';
import { sendReport } from '../components/ReportButton';

interface UserProfile {
  id: string;
  name: string;
  email: string;
  role: string;
  age?: number;
  bio?: string;
  skills?: string[];
  profileImage?: string;
  backgroundTheme?: string;
  location?: string;
  title?: string;
  createdAt: string;
  socialLinks: SocialLink[];
  achievements: any[];
  churchName?: string | null;
  isBlocked?: boolean;
}

interface SocialLink { id: string; platform: string; url: string }

const SOCIAL_PLATFORMS: Record<string, string> = {
  whatsapp: 'WhatsApp',
  instagram: 'Instagram',
  facebook: 'Facebook',
  linkedin: 'LinkedIn',
};

const notify = (message: string, status: 'success' | 'danger' = 'danger') => UIkit.notification({ message, status, pos: 'top-right' });

const Profile = () => {
  const { userId } = useParams<{ userId: string }>();
  const { user: currentUser, updateUser, logout } = useAuth();
  const { theme, toggle: toggleTheme } = useTheme();
  const navigate = useNavigate();
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [isEditing, setIsEditing] = useState(false);
  const [uploadingImage, setUploadingImage] = useState(false);
  const [profileImagePreview, setProfileImagePreview] = useState('');
  const [saving, setSaving] = useState(false);
  const [blocking, setBlocking] = useState(false);
  const [openingChat, setOpeningChat] = useState(false);
  const [reported, setReported] = useState(false);
  const photoInput = useRef<HTMLInputElement>(null);
  const [editForm, setEditForm] = useState({
    name: '',
    age: '',
    bio: '',
    location: '',
    title: '',
    backgroundTheme: 'light',
    skillsText: '',
    profileImage: '',
    socialLinks: [] as { platform: string; url: string }[],
  });

  const id = userId || currentUser?.id;
  const isOwnProfile = id === currentUser?.id;
  const isLeader = currentUser?.role === 'leader' || currentUser?.role === 'admin';

  const fillForm = (data: UserProfile) => setEditForm({
    name: data.name,
    age: data.age ? String(data.age) : '',
    bio: data.bio || '',
    location: data.location || '',
    title: data.title || '',
    backgroundTheme: data.backgroundTheme || 'light',
    skillsText: (data.skills || []).join(', '),
    profileImage: data.profileImage || '',
    socialLinks: (data.socialLinks || []).map(l => ({ platform: l.platform, url: l.url })),
  });

  useEffect(() => {
    if (!id) return;
    setLoading(true);
    setIsEditing(false);
    setReported(false);
    api.getUserProfile(id)
      .then(result => {
        if (result.success) {
          setProfile(result.data);
          fillForm(result.data);
        }
      })
      .catch(() => setProfile(null))
      .finally(() => setLoading(false));
  }, [id]);

  // Abre (ou cria) a conversa privada com esta pessoa
  const handleMessage = async () => {
    if (!profile) return;
    setOpeningChat(true);
    try {
      const res = await api.startConversation(profile.id);
      navigate(`/messages?c=${res.data.id}`);
    } catch (err: any) {
      notify(err.message || 'Não foi possível abrir a conversa');
      setOpeningChat(false);
    }
  };

  const handleImageSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file) return;
    setProfileImagePreview(URL.createObjectURL(file));
    setUploadingImage(true);
    try {
      const result = await api.uploadProfileImage(file);
      if (result.success) {
        setEditForm(prev => ({ ...prev, profileImage: result.data.profileImage }));
        notify('Foto carregada. Toque em "Salvar" para confirmar.', 'success');
      }
    } catch (err: any) {
      notify(err.message || 'Não foi possível enviar a foto');
      setProfileImagePreview('');
    } finally {
      setUploadingImage(false);
    }
  };

  const handleSaveProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    try {
      const result = await api.updateUserProfile({
        name: editForm.name,
        age: editForm.age ? parseInt(editForm.age, 10) : null,
        bio: editForm.bio,
        location: editForm.location,
        title: editForm.title,
        backgroundTheme: editForm.backgroundTheme,
        skills: editForm.skillsText.split(',').map(s => s.trim()).filter(Boolean),
        socialLinks: editForm.socialLinks.filter(l => l.url.trim()).map(l => ({ platform: l.platform, url: l.url.trim() })),
        profileImage: editForm.profileImage || undefined,
      });
      if (result.success) {
        setProfile(result.data);
        setIsEditing(false);
        setProfileImagePreview('');
        updateUser({ name: result.data.name, profileImage: result.data.profileImage, title: result.data.title });
        notify('Perfil atualizado', 'success');
      }
    } catch (err: any) {
      // O formulário fica aberto com o que foi escrito
      notify(err.message || 'Não foi possível guardar o perfil');
    } finally {
      setSaving(false);
    }
  };

  const cancelEdit = () => {
    if (profile) fillForm(profile);
    setProfileImagePreview('');
    setIsEditing(false);
  };

  const handleToggleBlock = async () => {
    if (!profile) return;
    if (!profile.isBlocked && !confirm(`Bloquear ${profile.name}? As publicações, comentários e mensagens desta pessoa deixam de aparecer para você.`)) return;
    setBlocking(true);
    try {
      if (profile.isBlocked) await api.unblockUser(profile.id);
      else await api.blockUser(profile.id);
      setProfile({ ...profile, isBlocked: !profile.isBlocked });
      notify(profile.isBlocked ? 'Pessoa desbloqueada' : 'Pessoa bloqueada', 'success');
    } catch (err: any) {
      notify(err.message || 'Não foi possível atualizar o bloqueio');
    } finally {
      setBlocking(false);
    }
  };

  const setSocialLink = (i: number, field: 'platform' | 'url', value: string) =>
    setEditForm(prev => ({ ...prev, socialLinks: prev.socialLinks.map((l, idx) => idx === i ? { ...l, [field]: value } : l) }));

  if (loading) {
    return <div className="loading-block" role="status" aria-label="Carregando o perfil"><span uk-spinner="ratio: 1.2"></span></div>;
  }

  if (!profile) {
    return (
      <div className="page is-medium">
        <div className="card"><EmptyState icon="user" title="Perfil não encontrado" text="Só é possível ver perfis de pessoas da sua comunidade." /></div>
      </div>
    );
  }

  const avatarSrc = profileImagePreview || editForm.profileImage || profile.profileImage;
  const guardianViewer = currentUser?.role === 'guardian';
  const menuActions: MenuAction[] = isOwnProfile ? [] : [
    ...(!guardianViewer ? [{ label: reported ? 'Denúncia enviada' : 'Denunciar perfil', icon: 'flag' as const, disabled: reported, onSelect: async () => setReported(await sendReport('profile', profile.id)) }] : []),
    { label: profile.isBlocked ? 'Desbloquear' : 'Bloquear', icon: profile.isBlocked ? 'unlock' : 'ban', danger: !profile.isBlocked, disabled: blocking, onSelect: handleToggleBlock },
  ];

  return (
    <div className="page is-medium">
      <section className="profile-head" aria-labelledby="profile-name">
        <div className="profile-head-row">
          <Avatar name={profile.name} profileImage={profile.profileImage} size={96} />
          <div className="profile-info">
            <h1 id="profile-name" className="profile-name">{profile.name}</h1>
            {profile.title && <p className="profile-title">{profile.title}</p>}
            <div className="profile-facts">
              <span><Icon name={profile.role === 'leader' || profile.role === 'admin' ? 'shield' : 'user'} size={16} /> {roleLabel(profile.role)}</span>
              {profile.churchName && <span><Icon name="users" size={16} /> {profile.churchName}</span>}
              {profile.location && <span><Icon name="location" size={16} /> {profile.location}</span>}
              <span><Icon name="calendar" size={16} /> Desde {new Date(profile.createdAt).toLocaleDateString('pt-BR', { month: 'long', year: 'numeric' })}</span>
            </div>
            <div className="profile-actions">
              {isOwnProfile ? (
                !isEditing && (
                  <button type="button" className="uk-button uk-button-default" onClick={() => setIsEditing(true)}>
                    <Icon name="pencil" size={18} /> Editar perfil
                  </button>
                )
              ) : (
                <>
                  {!profile.isBlocked && !guardianViewer && (
                    <button type="button" className="uk-button uk-button-primary" onClick={handleMessage} disabled={openingChat}>
                      <Icon name="messages" size={18} /> Mensagem
                    </button>
                  )}
                  <MoreMenu actions={menuActions} label={`Mais opções sobre ${profile.name}`} />
                </>
              )}
            </div>
          </div>
        </div>

        {profile.isBlocked && (
          <p className="protected-note" style={{ marginTop: '16px', borderRadius: 'var(--radius)' }}>
            <Icon name="ban" size={16} /> Você bloqueou esta pessoa: as publicações, comentários e mensagens dela ficam ocultos para você.
          </p>
        )}

        {profile.bio && !isEditing && <p className="profile-bio">{profile.bio}</p>}

        {!isEditing && ((profile.skills && profile.skills.length > 0) || profile.socialLinks?.length > 0) && (
          <div style={{ display: 'grid', gap: '16px', marginTop: '20px' }}>
            {profile.skills && profile.skills.length > 0 && (
              <div>
                <h2 className="list-label" style={{ fontSize: '14px', marginBottom: '8px' }}>Habilidades</h2>
                <div className="chip-list">{profile.skills.map(skill => <span key={skill} className="tag">{skill}</span>)}</div>
              </div>
            )}
            {profile.socialLinks?.length > 0 && (
              <div>
                <h2 className="list-label" style={{ fontSize: '14px', marginBottom: '8px' }}>Redes sociais</h2>
                <div className="chip-list">
                  {profile.socialLinks.map(link => (
                    <a key={link.id} href={link.url} target="_blank" rel="noopener noreferrer" className="social-link">
                      {SOCIAL_PLATFORMS[link.platform] || link.platform} <Icon name="external" size={14} />
                    </a>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}
      </section>

      {/* Editar o próprio perfil */}
      {isOwnProfile && isEditing && (
        <form className="card section" style={{ padding: '20px' }} onSubmit={handleSaveProfile} aria-labelledby="edit-title">
          <h2 id="edit-title" className="list-label" style={{ fontSize: '17px', marginBottom: '16px' }}>Editar perfil</h2>

          <div style={{ display: 'flex', alignItems: 'center', gap: '16px', marginBottom: '20px' }}>
            <button type="button" className="avatar-picker" onClick={() => photoInput.current?.click()} aria-label="Escolher foto de perfil">
              {avatarSrc ? <img src={avatarSrc} alt="" /> : <Icon name="camera" size={24} />}
            </button>
            <div>
              <input ref={photoInput} type="file" accept="image/jpeg,image/png,image/gif,image/webp" hidden onChange={handleImageSelect} />
              <button type="button" className="uk-button uk-button-default uk-button-small" onClick={() => photoInput.current?.click()} disabled={uploadingImage}>
                {uploadingImage ? 'Enviando…' : 'Alterar foto'}
              </button>
              <p className="form-hint">JPEG, PNG, GIF ou WebP.</p>
            </div>
          </div>

          <div className="form-grid">
            <div>
              <label className="form-label" htmlFor="profile-name-input">Nome</label>
              <input id="profile-name-input" className="form-input" type="text" value={editForm.name} onChange={e => setEditForm({ ...editForm, name: e.target.value })} required />
            </div>
            <div>
              <label className="form-label" htmlFor="profile-age">Idade</label>
              <input id="profile-age" className="form-input" type="number" min="1" max="150" value={editForm.age} onChange={e => setEditForm({ ...editForm, age: e.target.value })} />
            </div>
            <div>
              <label className="form-label" htmlFor="profile-location">Localização</label>
              <input id="profile-location" className="form-input" type="text" placeholder="Ex.: Matola, Maputo" value={editForm.location} onChange={e => setEditForm({ ...editForm, location: e.target.value })} />
            </div>
            <div>
              <label className="form-label" htmlFor="profile-title">Título ou função</label>
              <input id="profile-title" className="form-input" type="text" placeholder="Ex.: Líder de louvor" value={editForm.title} onChange={e => setEditForm({ ...editForm, title: e.target.value })} />
            </div>
            <div className="is-wide">
              <label className="form-label" htmlFor="profile-bio">Sobre você</label>
              <textarea id="profile-bio" className="form-input" rows={3} placeholder="Conte um pouco sobre você…" value={editForm.bio} onChange={e => setEditForm({ ...editForm, bio: e.target.value })} />
            </div>
            <div className="is-wide">
              <label className="form-label" htmlFor="profile-skills">Habilidades</label>
              <input id="profile-skills" className="form-input" type="text" placeholder="Ex.: Música, Design, Liderança" value={editForm.skillsText} onChange={e => setEditForm({ ...editForm, skillsText: e.target.value })} aria-describedby="profile-skills-hint" />
              <p id="profile-skills-hint" className="form-hint">Separe por vírgulas.</p>
            </div>
            <fieldset className="is-wide" style={{ margin: 0, padding: 0, border: 0, display: 'grid', gap: '8px' }}>
              <legend className="form-label">Redes sociais</legend>
              {editForm.socialLinks.map((link, i) => (
                <div key={i} style={{ display: 'flex', gap: '8px' }}>
                  <select className="uk-select" aria-label={`Rede ${i + 1}`} value={link.platform} onChange={e => setSocialLink(i, 'platform', e.target.value)} style={{ width: '150px', flexShrink: 0 }}>
                    {Object.entries(SOCIAL_PLATFORMS).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
                  </select>
                  <input className="form-input" type="url" placeholder="https://…" aria-label={`Endereço da rede ${i + 1}`} value={link.url} onChange={e => setSocialLink(i, 'url', e.target.value)} />
                  <button type="button" className="action-btn" aria-label={`Remover a rede ${i + 1}`} onClick={() => setEditForm(prev => ({ ...prev, socialLinks: prev.socialLinks.filter((_, idx) => idx !== i) }))}>
                    <Icon name="close" size={18} />
                  </button>
                </div>
              ))}
              {editForm.socialLinks.length < 4 && (
                <button type="button" className="ghost-btn" style={{ justifySelf: 'start', paddingLeft: 0 }}
                  onClick={() => setEditForm(prev => ({ ...prev, socialLinks: [...prev.socialLinks, { platform: Object.keys(SOCIAL_PLATFORMS).find(p => !prev.socialLinks.some(l => l.platform === p)) || 'instagram', url: '' }] }))}>
                  <Icon name="plus" size={18} /> Adicionar rede social
                </button>
              )}
            </fieldset>
          </div>

          <div className="form-btn-row">
            <button type="button" className="form-btn" onClick={cancelEdit}>Cancelar</button>
            <button type="submit" className="form-btn primary" disabled={saving || uploadingImage}>
              {saving ? <><span uk-spinner="ratio: 0.5"></span> Salvando…</> : 'Salvar'}
            </button>
          </div>
        </form>
      )}

      {/* Distintivos */}
      {profile.achievements?.length > 0 && (
        <section className="section" aria-labelledby="achievements-title">
          <h2 id="achievements-title" className="list-label">Distintivos</h2>
          <div className="card">
            {profile.achievements.map((a: any) => (
              <div key={a.id} className="list-row">
                <Icon name="award" size={22} className="muted" />
                <span className="list-row-body">
                  <span className="list-row-title"><span>{a.name}</span></span>
                  {a.description && <span className="list-row-meta" style={{ display: 'block', whiteSpace: 'normal' }}>{a.description}</span>}
                </span>
              </div>
            ))}
          </div>
        </section>
      )}

      {/* Conta (no telemóvel; no computador está no menu do avatar) */}
      {isOwnProfile && (
        <section className="section hide-wide" aria-labelledby="account-title">
          <h2 id="account-title" className="list-label">Conta</h2>
          <div className="card">
            {isLeader && (
              <>
                <Link to="/dashboard" className="list-row"><Icon name="dashboard" /><span className="list-row-body list-row-title">Painel do líder</span><Icon name="chevron-right" size={18} className="faint" /></Link>
                <Link to="/reports" className="list-row"><Icon name="reports" /><span className="list-row-body list-row-title">Relatórios</span><Icon name="chevron-right" size={18} className="faint" /></Link>
              </>
            )}
            <button type="button" className="list-row" role="switch" aria-checked={theme === 'dark'} onClick={toggleTheme}>
              <Icon name="moon" /><span className="list-row-body list-row-title">Tema escuro</span>
              <span className={`switch${theme === 'dark' ? ' is-on' : ''}`} aria-hidden="true"></span>
            </button>
            <button type="button" className="list-row" onClick={logout} style={{ color: 'var(--danger)' }}>
              <Icon name="logout" /><span className="list-row-body" style={{ fontSize: '15px', fontWeight: 600 }}>Sair</span>
            </button>
          </div>
        </section>
      )}
    </div>
  );
};

export default Profile;
