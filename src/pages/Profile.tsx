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
    } catch (err) {
      UIkit.notification({ message: 'Erro ao carregar perfil', status: 'danger' });
    } finally {
      setLoading(false);
    }
  };

  const handleImageSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const previewUrl = URL.createObjectURL(file);
    setProfileImagePreview(previewUrl);

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

  const getRoleBadgeClass = (role: string) => {
    switch (role) {
      case 'admin': return 'uk-label-danger';
      case 'leader': return 'uk-label-warning';
      default: return 'uk-label-info';
    }
  };

  const getRoleLabel = (role: string) => {
    switch (role) {
      case 'admin': return 'Administrador';
      case 'leader': return 'Líder';
      default: return 'Membro';
    }
  };

  if (loading) {
    return (
      <div className="uk-text-center uk-margin-large-top">
        <span uk-spinner="ratio: 3"></span>
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

  const backgroundThemes: Record<string, string> = {
    light: '#ffffff',
    dark: '#2c3e50',
    blue: '#3498db',
    green: '#27ae60',
    purple: '#8e44ad',
  };

  const currentAvatarSrc = profileImagePreview || editForm.profileImage || profile.profileImage;

  return (
    <div>
      {/* Header with background */}
      <div
        className="uk-padding uk-padding-large uk-border-rounded uk-margin-bottom"
        style={{
          backgroundColor: backgroundThemes[profile.backgroundTheme || 'light'] || '#ffffff',
          color: ['dark', 'blue', 'green', 'purple'].includes(profile.backgroundTheme || '') ? '#fff' : '#000'
        }}
      >
        <div className="uk-grid uk-grid-medium uk-flex-middle" uk-grid="true">
          <div className="uk-width-auto">
            <div
              className="uk-border-circle uk-flex uk-flex-center uk-flex-middle"
              style={{ width: '120px', height: '120px', backgroundColor: '#ddd', fontSize: '48px', overflow: 'hidden' }}
            >
              {profile.profileImage ? (
                <img src={profile.profileImage} alt={profile.name} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
              ) : (
                <span uk-icon="icon: user; ratio: 2"></span>
              )}
            </div>
          </div>
          <div className="uk-width-expand">
            <h2 className="uk-margin-remove">{profile.name}</h2>
            {profile.title && <p className="uk-text-lead uk-margin-small">{profile.title}</p>}
            <p className="uk-margin-small">
              <span className={`uk-label uk-border-rounded ${getRoleBadgeClass(profile.role)}`}>
                {getRoleLabel(profile.role)}
              </span>
            </p>
            {profile.location && (
              <p className="uk-text-small uk-margin-small">
                <span uk-icon="icon: location"></span> {profile.location}
              </p>
            )}
            <p className="uk-text-small uk-margin-remove">Membro desde {new Date(profile.createdAt).toLocaleDateString('pt-BR')}</p>
          </div>
          {isOwnProfile && (
            <div className="uk-width-auto">
              <button
                className="uk-button uk-button-primary uk-border-rounded"
                onClick={() => setIsEditing(!isEditing)}
              >
                <span uk-icon="pencil" className="uk-margin-small-right"></span>
                {isEditing ? 'Cancelar' : 'Editar Perfil'}
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Edit Form */}
      {isOwnProfile && isEditing && (
        <div className="uk-card uk-card-default uk-card-body uk-margin-bottom uk-border-rounded">
          <h3 className="uk-card-title">Editar Perfil</h3>
          <form onSubmit={handleSaveProfile} className="uk-form-stacked">
            <div className="uk-grid uk-grid-medium" uk-grid="true">

              {/* Foto de Perfil */}
              <div className="uk-width-1-1">
                <label className="uk-form-label">Foto de Perfil</label>
                <div style={{ display: 'flex', alignItems: 'center', gap: '16px', marginTop: '8px' }}>
                  <div
                    style={{
                      width: '80px',
                      height: '80px',
                      borderRadius: '50%',
                      backgroundColor: '#e9ecef',
                      overflow: 'hidden',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      border: '2px dashed #adb5bd',
                      cursor: 'pointer',
                      flexShrink: 0,
                    }}
                    onClick={() => document.getElementById('profileImageInput')?.click()}
                  >
                    {currentAvatarSrc ? (
                      <img src={currentAvatarSrc} alt="Preview" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                    ) : (
                      <span uk-icon="icon: camera; ratio: 1.5" style={{ color: '#adb5bd' }}></span>
                    )}
                  </div>
                  <div>
                    <input
                      id="profileImageInput"
                      type="file"
                      accept="image/jpeg,image/png,image/gif,image/webp"
                      style={{ display: 'none' }}
                      onChange={handleImageSelect}
                    />
                    <button
                      type="button"
                      className="uk-button uk-button-default uk-border-rounded"
                      onClick={() => document.getElementById('profileImageInput')?.click()}
                      disabled={uploadingImage}
                    >
                      {uploadingImage ? 'Enviando...' : 'Alterar Foto'}
                    </button>
                    {editForm.profileImage && !uploadingImage && (
                      <p className="uk-text-small uk-text-success" style={{ marginTop: '6px', marginBottom: 0 }}>
                        ✓ Foto pronta para salvar
                      </p>
                    )}
                  </div>
                </div>
              </div>

              <div className="uk-width-1-2@m">
                <label className="uk-form-label">Nome</label>
                <input
                  className="uk-input uk-border-rounded"
                  type="text"
                  value={editForm.name}
                  onChange={(e) => setEditForm({ ...editForm, name: e.target.value })}
                  required
                />
              </div>
              <div className="uk-width-1-2@m">
                <label className="uk-form-label">Idade</label>
                <input
                  className="uk-input uk-border-rounded"
                  type="number"
                  min="1"
                  max="150"
                  value={editForm.age}
                  onChange={(e) => setEditForm({ ...editForm, age: e.target.value })}
                />
              </div>
              <div className="uk-width-1-2@m">
                <label className="uk-form-label">Localização</label>
                <input
                  className="uk-input uk-border-rounded"
                  type="text"
                  placeholder="Ex: São Paulo, SP"
                  value={editForm.location}
                  onChange={(e) => setEditForm({ ...editForm, location: e.target.value })}
                />
              </div>
              <div className="uk-width-1-2@m">
                <label className="uk-form-label">Título / Cargo</label>
                <input
                  className="uk-input uk-border-rounded"
                  type="text"
                  placeholder="Ex: Estudante, Desenvolvedor"
                  value={editForm.title}
                  onChange={(e) => setEditForm({ ...editForm, title: e.target.value })}
                />
              </div>
              <div className="uk-width-1-2@m">
                <label className="uk-form-label">Tema de Fundo</label>
                <select
                  className="uk-select uk-border-rounded"
                  value={editForm.backgroundTheme}
                  onChange={(e) => setEditForm({ ...editForm, backgroundTheme: e.target.value })}
                >
                  <option value="light">Claro</option>
                  <option value="dark">Escuro</option>
                  <option value="blue">Azul</option>
                  <option value="green">Verde</option>
                  <option value="purple">Roxo</option>
                </select>
              </div>
              <div className="uk-width-1-1">
                <label className="uk-form-label">Bio / Descrição</label>
                <textarea
                  className="uk-textarea uk-border-rounded"
                  rows={4}
                  placeholder="Conte um pouco sobre você..."
                  value={editForm.bio}
                  onChange={(e) => setEditForm({ ...editForm, bio: e.target.value })}
                ></textarea>
              </div>
              <div className="uk-width-1-1">
                <label className="uk-form-label">Habilidades (separadas por vírgula)</label>
                <input
                  className="uk-input uk-border-rounded"
                  type="text"
                  placeholder="Ex: JavaScript, Design, Liderança"
                  value={editForm.skills.join(', ')}
                  onChange={(e) => setEditForm({ ...editForm, skills: e.target.value.split(',').map(s => s.trim()) })}
                />
              </div>
            </div>
            <button className="uk-button uk-button-primary uk-margin-top uk-border-rounded" type="submit">
              Salvar Alterações
            </button>
          </form>
        </div>
      )}

      {/* Bio Section */}
      {profile.bio && (
        <div className="uk-card uk-card-default uk-card-body uk-margin-bottom uk-border-rounded">
          <h4 className="uk-text-bold">Sobre</h4>
          <p>{profile.bio}</p>
        </div>
      )}

      {/* Skills */}
      {profile.skills && profile.skills.length > 0 && (
        <div className="uk-card uk-card-default uk-card-body uk-margin-bottom uk-border-rounded">
          <h4 className="uk-text-bold">Habilidades</h4>
          <div className="uk-flex uk-flex-wrap uk-gap">
            {profile.skills.map((skill, idx) => (
              <span key={idx} className="uk-label uk-label-info uk-border-rounded">
                {skill}
              </span>
            ))}
          </div>
        </div>
      )}

      {/* Social Links */}
      {profile.socialLinks && profile.socialLinks.length > 0 && (
        <div className="uk-card uk-card-default uk-card-body uk-margin-bottom uk-border-rounded">
          <h4 className="uk-text-bold">Redes Sociais</h4>
          <div className="uk-flex uk-flex-wrap uk-gap">
            {profile.socialLinks.map((link: SocialLink) => {
              const icons: any = {
                whatsapp: 'whatsapp',
                linkedin: 'linkedin',
                facebook: 'facebook',
                instagram: 'instagram',
              };
              return (
                <a
                  key={link.id}
                  href={link.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="uk-icon-button"
                  title={link.platform}
                >
                  <span uk-icon={icons[link.platform]}></span>
                </a>
              );
            })}
          </div>
        </div>
      )}

      {/* Achievements/Badges */}
      {profile.achievements && profile.achievements.length > 0 && (
        <div className="uk-card uk-card-default uk-card-body uk-margin-bottom uk-border-rounded">
          <h4 className="uk-text-bold">Distintivos</h4>
          <div className="uk-grid uk-grid-medium" uk-grid="true">
            {profile.achievements.map((achievement: any) => (
              <div key={achievement.id} className="uk-width-1-3@m uk-text-center">
                <div className="uk-text-lead">🏆</div>
                <p className="uk-text-bold uk-margin-small">{achievement.name}</p>
                {achievement.description && (
                  <p className="uk-text-small uk-text-muted">{achievement.description}</p>
                )}
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

export default Profile;
