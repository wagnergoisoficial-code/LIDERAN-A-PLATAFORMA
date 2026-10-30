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
            parent.style.backgroundColor = 'var(--bg-elevated)';
            parent.style.color = 'var(--text-muted)';
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
        backgroundColor: 'var(--bg-elevated)',
        color: 'var(--text-muted)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        fontWeight: 600,
        fontSize: s.fontSize,
        border: '1px solid var(--border)',
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
