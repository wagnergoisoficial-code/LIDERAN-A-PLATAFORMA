import React, { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import { api } from '../services/api';
import { useAuth } from '../context/AuthContext';
import UIkit from 'uikit';

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
  socialLinks: any[];
  achievements: any[];
}

interface SocialLink {
  id: string;
  platform: string;
  url: string;
}

const Profile = () => {
  const { userId } = useParams<{ userId: string }>();
  const { user: currentUser, updateUser } = useAuth();
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [isEditing, setIsEditing] = useState(false);
  const [isOwnProfile, setIsOwnProfile] = useState(false);
  const [uploadingImage, setUploadingImage] = useState(false);
  const [profileImagePreview, setProfileImagePreview] = useState('');

  const [editForm, setEditForm] = useState({
    name: '',
    age: '',
    bio: '',
    location: '',
    title: '',
    backgroundTheme: 'light',
    skills: [] as string[],
    profileImage: '',
  });

  useEffect(() => {
    const id = userId || currentUser?.id;
    if (id) {
      loadProfile(id);
      setIsOwnProfile(id === currentUser?.id);
    }
  }, [userId, currentUser?.id]);

  const loadProfile = async (id: string) => {
    try {
      const result = await api.getUserProfile(id);
      if (result.success) {
        setProfile(result.data);
        setEditForm({
          name: result.data.name,
          age: result.data.age || '',
          bio: result.data.bio || '',
          location: result.data.location || '',
          title: result.data.title || '',
          backgroundTheme: result.data.backgroundTheme || 'light',
          skills: result.data.skills || [],
          profileImage: result.data.profileImage || '',
        });
      }
    } catch {
      UIkit.notification({ message: 'Erro ao carregar perfil', status: 'danger' });
    } finally {
      setLoading(false);
    }
  };

  const handleImageSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setProfileImagePreview(URL.createObjectURL(file));
    setUploadingImage(true);
    try {
      const result = await api.uploadProfileImage(file);
      if (result.success) {
        setEditForm(prev => ({ ...prev, profileImage: result.data.profileImage }));
        UIkit.notification({ message: 'Foto carregada! Clique em Salvar para confirmar.', status: 'success' });
      }
    } catch (err: any) {
      UIkit.notification({ message: err.message || 'Erro ao enviar foto', status: 'danger' });
      setProfileImagePreview('');
    } finally {
      setUploadingImage(false);
    }
  };

  const handleSaveProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const result = await api.updateUserProfile({
        name: editForm.name,
        age: editForm.age ? parseInt(editForm.age) : null,
        bio: editForm.bio,
        location: editForm.location,
        title: editForm.title,
        backgroundTheme: editForm.backgroundTheme,
        skills: editForm.skills.filter(s => s.trim()),
        socialLinks: profile?.socialLinks,
        profileImage: editForm.profileImage || undefined,
      });
      if (result.success) {
        setProfile(result.data);
        setIsEditing(false);
        setProfileImagePreview('');
        updateUser({ name: result.data.name, profileImage: result.data.profileImage });
        UIkit.notification({ message: 'Perfil atualizado com sucesso!', status: 'success' });
      }
    } catch (err: any) {
      UIkit.notification({ message: err.message || 'Erro ao atualizar perfil', status: 'danger' });
    }
  };

  const getRoleBadge = (role: string) => {
    switch (role) {
      case 'admin': return { label: 'Administrador', cls: 'uk-label-danger' };
      case 'leader': return { label: 'Líder', cls: 'uk-label-warning' };
      default: return { label: 'Membro', cls: 'uk-label-info' };
    }
  };

  const socialIcons: Record<string, string> = {
    whatsapp: 'whatsapp', linkedin: 'linkedin',
    facebook: 'facebook', instagram: 'instagram',
  };

  if (loading) {
    return (
      <div style={{ textAlign: 'center', padding: '80px 0' }}>
        <span uk-spinner="ratio: 2"></span>
      </div>
    );
  }

  if (!profile) {
    return (
      <div className="uk-alert uk-alert-danger">
        <p>Usuário não encontrado</p>
      </div>
    );
  }

  const roleBadge = getRoleBadge(profile.role);
  const avatarSrc = profileImagePreview || editForm.profileImage || profile.profileImage;

  return (
    <div style={{ maxWidth: '800px' }}>

      {/* ── PROFILE HEADER ──────────────────────────────────────── */}
      <div style={{ border: '1px solid var(--border)', background: 'var(--bg)', marginBottom: '20px' }}>
        {/* Accent top bar */}
        <div style={{ height: '3px', background: 'var(--nav-bg)' }}></div>

        <div style={{ padding: '24px', display: 'flex', alignItems: 'flex-start', gap: '20px' }}>
          {/* Avatar */}
          <div style={{
            width: '72px', height: '72px',
            background: 'var(--bg-elevated)',
            border: '1px solid var(--border-strong)',
            overflow: 'hidden',
            flexShrink: 0,
            display: 'flex', alignItems: 'center', justifyContent: 'center'
          }}>
            {profile.profileImage ? (
              <img src={profile.profileImage} alt={profile.name} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
            ) : (
              <span uk-icon="icon: user; ratio: 1.8" style={{ color: 'var(--text-faint)' }}></span>
            )}
          </div>

          {/* Info */}
          <div style={{ flex: 1 }}>
            <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: '12px' }}>
              <div>
                <h2 style={{ margin: '0 0 4px', fontSize: '20px', fontWeight: 700 }}>{profile.name}</h2>
                {profile.title && (
                  <p style={{ margin: '0 0 8px', fontSize: '13px', color: 'var(--text-muted)' }}>{profile.title}</p>
                )}
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flexWrap: 'wrap' }}>
                  <span className={`uk-label ${roleBadge.cls}`}>{roleBadge.label}</span>
                  {profile.location && (
                    <span style={{ fontSize: '12px', color: 'var(--text-faint)', display: 'flex', alignItems: 'center', gap: '3px' }}>
                      <span uk-icon="icon: location; ratio: 0.75"></span>
                      {profile.location}
                    </span>
                  )}
                  <span style={{ fontSize: '12px', color: 'var(--text-faint)' }}>
                    Membro desde {new Date(profile.createdAt).toLocaleDateString('pt-BR')}
                  </span>
                </div>
              </div>

              {isOwnProfile && (
                <button
                  onClick={() => setIsEditing(!isEditing)}
                  style={{
                    padding: '0 14px', height: '32px',
                    background: isEditing ? 'var(--bg-surface)' : 'transparent',
                    color: 'var(--text-muted)',
                    border: '1px solid var(--border-strong)',
                    fontSize: '12px', fontFamily: 'inherit', fontWeight: 500, cursor: 'pointer',
                    display: 'flex', alignItems: 'center', gap: '5px',
                    transition: 'all 160ms ease', whiteSpace: 'nowrap'
                  }}
                  onMouseEnter={(e) => { e.currentTarget.style.borderColor = 'var(--accent)'; e.currentTarget.style.color = 'var(--accent)'; }}
                  onMouseLeave={(e) => { e.currentTarget.style.borderColor = 'var(--border-strong)'; e.currentTarget.style.color = 'var(--text-muted)'; }}
                >
                  <span uk-icon={`icon: ${isEditing ? 'close' : 'pencil'}; ratio: 0.8`}></span>
                  {isEditing ? 'Cancelar' : 'Editar Perfil'}
                </button>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* ── EDIT FORM ────────────────────────────────────────────── */}
      {isOwnProfile && isEditing && (
        <div style={{ border: '1px solid var(--border)', background: 'var(--bg)', marginBottom: '20px' }}>
          <div style={{ padding: '12px 20px', background: 'var(--bg-surface)', borderBottom: '1px solid var(--border)' }}>
            <span style={{ fontSize: '11px', fontWeight: 700, letterSpacing: '0.07em', textTransform: 'uppercase', color: 'var(--text-muted)' }}>
              Editar Perfil
            </span>
          </div>
          <div style={{ padding: '20px' }}>
            <form onSubmit={handleSaveProfile} className="uk-form-stacked">

              {/* Avatar upload */}
              <div style={{ marginBottom: '20px', display: 'flex', alignItems: 'center', gap: '16px' }}>
                <div
                  style={{
                    width: '64px', height: '64px',
                    border: '1px dashed var(--border-strong)',
                    background: 'var(--bg-elevated)',
                    overflow: 'hidden',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    cursor: 'pointer', flexShrink: 0
                  }}
                  onClick={() => document.getElementById('profileImageInput')?.click()}
                >
                  {avatarSrc ? (
                    <img src={avatarSrc} alt="Preview" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                  ) : (
                    <span uk-icon="icon: camera; ratio: 1.2" style={{ color: 'var(--text-faint)' }}></span>
                  )}
                </div>
                <div>
                  <input id="profileImageInput" type="file" accept="image/jpeg,image/png,image/gif,image/webp" style={{ display: 'none' }} onChange={handleImageSelect} />
                  <button
                    type="button"
                    className="uk-button uk-button-default"
                    onClick={() => document.getElementById('profileImageInput')?.click()}
                    disabled={uploadingImage}
                    style={{ fontSize: '12px', height: '30px' }}
                  >
                    {uploadingImage ? 'Enviando...' : 'Alterar Foto'}
                  </button>
                  {editForm.profileImage && !uploadingImage && (
                    <p style={{ margin: '5px 0 0', fontSize: '12px', color: 'var(--success)' }}>
                      <span uk-icon="icon: check; ratio: 0.8"></span> Foto pronta
                    </p>
                  )}
                </div>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '14px', alignItems: 'start' }}>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                  <label className="uk-form-label" style={{ marginBottom: 0 }}>Nome</label>
                  <input className="uk-input" type="text" value={editForm.name} onChange={(e) => setEditForm({ ...editForm, name: e.target.value })} required />
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                  <label className="uk-form-label" style={{ marginBottom: 0 }}>Idade</label>
                  <input className="uk-input" type="number" min="1" max="150" value={editForm.age} onChange={(e) => setEditForm({ ...editForm, age: e.target.value })} />
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                  <label className="uk-form-label" style={{ marginBottom: 0 }}>Localização</label>
                  <input className="uk-input" type="text" placeholder="Ex: São Paulo, SP" value={editForm.location} onChange={(e) => setEditForm({ ...editForm, location: e.target.value })} />
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                  <label className="uk-form-label" style={{ marginBottom: 0 }}>Título / Cargo</label>
                  <input className="uk-input" type="text" placeholder="Ex: Líder de Jovens" value={editForm.title} onChange={(e) => setEditForm({ ...editForm, title: e.target.value })} />
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', gridColumn: '1 / -1' }}>
                  <label className="uk-form-label" style={{ marginBottom: 0 }}>Bio</label>
                  <textarea className="uk-textarea" rows={3} placeholder="Conte um pouco sobre você..." value={editForm.bio} onChange={(e) => setEditForm({ ...editForm, bio: e.target.value })}></textarea>
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', gridColumn: '1 / -1' }}>
                  <label className="uk-form-label" style={{ marginBottom: 0 }}>Habilidades (separadas por vírgula)</label>
                  <input className="uk-input" type="text" placeholder="Ex: Liderança, Música, Design" value={editForm.skills.join(', ')} onChange={(e) => setEditForm({ ...editForm, skills: e.target.value.split(',').map(s => s.trim()) })} />
                </div>
              </div>

              <div style={{ marginTop: '16px' }}>
                <button className="uk-button uk-button-primary" type="submit" style={{ height: '36px' }}>
                  <span uk-icon="icon: check; ratio: 0.85"></span>
                  Salvar Alterações
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ── BIO ──────────────────────────────────────────────────── */}
      {profile.bio && (
        <div style={{ border: '1px solid var(--border)', background: 'var(--bg)', marginBottom: '16px' }}>
          <div style={{ padding: '12px 20px', background: 'var(--bg-surface)', borderBottom: '1px solid var(--border)' }}>
            <span style={{ fontSize: '11px', fontWeight: 700, letterSpacing: '0.07em', textTransform: 'uppercase', color: 'var(--text-muted)' }}>Sobre</span>
          </div>
          <div style={{ padding: '16px 20px' }}>
            <p style={{ margin: 0, fontSize: '14px', color: 'var(--text)', lineHeight: 1.7 }}>{profile.bio}</p>
          </div>
        </div>
      )}

      {/* ── SKILLS ──────────────────────────────────────────────── */}
      {profile.skills && profile.skills.length > 0 && (
        <div style={{ border: '1px solid var(--border)', background: 'var(--bg)', marginBottom: '16px' }}>
          <div style={{ padding: '12px 20px', background: 'var(--bg-surface)', borderBottom: '1px solid var(--border)' }}>
            <span style={{ fontSize: '11px', fontWeight: 700, letterSpacing: '0.07em', textTransform: 'uppercase', color: 'var(--text-muted)' }}>Habilidades</span>
          </div>
          <div style={{ padding: '16px 20px', display: 'flex', flexWrap: 'wrap', gap: '6px' }}>
            {profile.skills.map((skill, i) => (
              <span key={i} style={{
                padding: '4px 12px', fontSize: '12px', fontWeight: 500,
                background: 'var(--bg-elevated)', border: '1px solid var(--border-strong)',
                color: 'var(--text-muted)'
              }}>
                {skill}
              </span>
            ))}
          </div>
        </div>
      )}

      {/* ── SOCIAL LINKS ────────────────────────────────────────── */}
      {profile.socialLinks?.length > 0 && (
        <div style={{ border: '1px solid var(--border)', background: 'var(--bg)', marginBottom: '16px' }}>
          <div style={{ padding: '12px 20px', background: 'var(--bg-surface)', borderBottom: '1px solid var(--border)' }}>
            <span style={{ fontSize: '11px', fontWeight: 700, letterSpacing: '0.07em', textTransform: 'uppercase', color: 'var(--text-muted)' }}>Redes Sociais</span>
          </div>
          <div style={{ padding: '16px 20px', display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
            {profile.socialLinks.map((link: SocialLink) => (
              <a
                key={link.id}
                href={link.url}
                target="_blank"
                rel="noopener noreferrer"
                className="uk-icon-button"
                title={link.platform}
              >
                <span uk-icon={socialIcons[link.platform] || 'world'}></span>
              </a>
            ))}
          </div>
        </div>
      )}

      {/* ── ACHIEVEMENTS ────────────────────────────────────────── */}
      {profile.achievements?.length > 0 && (
        <div style={{ border: '1px solid var(--border)', background: 'var(--bg)', marginBottom: '16px' }}>
          <div style={{ padding: '12px 20px', background: 'var(--bg-surface)', borderBottom: '1px solid var(--border)' }}>
            <span style={{ fontSize: '11px', fontWeight: 700, letterSpacing: '0.07em', textTransform: 'uppercase', color: 'var(--text-muted)' }}>Distintivos</span>
          </div>
          <div style={{ padding: '20px', display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(160px, 1fr))', gap: '16px' }}>
            {profile.achievements.map((a: any) => (
              <div key={a.id} style={{ textAlign: 'center', padding: '16px', border: '1px solid var(--border)' }}>
                <span uk-icon="icon: star; ratio: 1.8" style={{ color: 'var(--warning)', display: 'block', marginBottom: '8px' }}></span>
                <div style={{ fontSize: '13px', fontWeight: 600, color: 'var(--text)', marginBottom: '4px' }}>{a.name}</div>
                {a.description && <div style={{ fontSize: '12px', color: 'var(--text-faint)' }}>{a.description}</div>}
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

export default Profile;
