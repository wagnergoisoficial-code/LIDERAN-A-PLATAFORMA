import React from 'react';

interface AvatarProps {
  name: string;
  profileImage?: string;
  size?: 'small' | 'medium' | 'large';
  className?: string;
}

const getInitials = (name: string): string => {
  if (!name) return '?';
  return name.split(' ').map(p => p[0]).filter(Boolean).join('').toUpperCase().slice(0, 2) || '?';
};

const getColorFromName = (name: string): string => {
  const colors = ['#3b82f6', '#6366f1', '#8b5cf6', '#ec4899', '#f59e0b', '#10b981', '#0ea5e9', '#ef4444'];
  if (!name) return colors[0];
  let hash = 0;
  for (let i = 0; i < name.length; i++) hash = name.charCodeAt(i) + ((hash << 5) - hash);
  return colors[Math.abs(hash) % colors.length];
};

const Avatar: React.FC<AvatarProps> = ({ name: nameProp, profileImage, size = 'medium', className }) => {
  const name = nameProp || '';
  const sizeMap = {
    small:  { width: '32px', height: '32px', fontSize: '11px' },
    medium: { width: '44px', height: '44px', fontSize: '14px' },
    large:  { width: '64px', height: '64px', fontSize: '18px' },
  };
  const s = sizeMap[size];

  if (profileImage) {
    return (
      <img
        src={profileImage}
        alt={name}
        className={`avatar-circle${className ? ` ${className}` : ''}`}
        style={{
          width: s.width, height: s.height,
          objectFit: 'cover',
          display: 'block',
          border: '1px solid var(--border)',
          flexShrink: 0,
        }}
        onError={(e) => {
          const target = e.target as HTMLImageElement;
          target.style.display = 'none';
          const parent = target.parentElement;
          if (parent) {
            parent.style.backgroundColor = getColorFromName(name);
            parent.style.color = 'white';
            parent.innerHTML = getInitials(name);
          }
        }}
      />
    );
  }

  return (
    <div
      className={`avatar-circle${className ? ` ${className}` : ''}`}
      style={{
        width: s.width, height: s.height,
        backgroundColor: getColorFromName(name),
        color: 'white',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        fontWeight: 600,
        fontSize: s.fontSize,
        border: '1px solid rgba(0,0,0,0.08)',
        flexShrink: 0,
        letterSpacing: '0.02em',
      }}
      title={name}
    >
      {getInitials(name)}
    </div>
  );
};

export default Avatar;
