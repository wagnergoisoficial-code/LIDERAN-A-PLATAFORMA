import React from 'react';

interface AvatarProps {
  name: string;
  profileImage?: string;
  size?: 'small' | 'medium' | 'large';
  className?: string;
}

const getInitials = (name: string): string => {
  return name
    .split(' ')
    .map(part => part[0])
    .join('')
    .toUpperCase()
    .slice(0, 2);
};

const getColorFromName = (name: string): string => {
  const colors = [
    '#FF6B6B', '#4ECDC4', '#45B7D1', '#FFA07A', '#98D8C8',
    '#F7DC6F', '#BB8FCE', '#85C1E2', '#F8B88B', '#ABEBC6'
  ];
  let hash = 0;
  for (let i = 0; i < name.length; i++) {
    hash = name.charCodeAt(i) + ((hash << 5) - hash);
  }
  return colors[Math.abs(hash) % colors.length];
};

const Avatar: React.FC<AvatarProps> = ({ 
  name, 
  profileImage, 
  size = 'medium',
  className 
}) => {
  const sizeMap = {
    small: { width: '32px', height: '32px', fontSize: '12px' },
    medium: { width: '48px', height: '48px', fontSize: '14px' },
    large: { width: '64px', height: '64px', fontSize: '16px' }
  };

  const sizeStyle = sizeMap[size];

  if (profileImage) {
    return (
      <img
        src={profileImage}
        alt={name}
        className={className}
        style={{
          width: sizeStyle.width,
          height: sizeStyle.height,
          borderRadius: '50%',
          objectFit: 'cover',
          display: 'block',
          border: '2px solid #fff',
          boxShadow: '0 2px 4px rgba(0, 0, 0, 0.1)',
          ...sizeStyle
        }}
        onError={(e) => {
          // Se a imagem não carregar, mostrar fallback
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
      className={className}
      style={{
        width: sizeStyle.width,
        height: sizeStyle.height,
        borderRadius: '50%',
        backgroundColor: getColorFromName(name),
        color: 'white',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        fontWeight: '600',
        fontSize: sizeStyle.fontSize,
        border: '2px solid #fff',
        boxShadow: '0 2px 4px rgba(0, 0, 0, 0.1)',
        flexShrink: 0
      }}
      title={name}
    >
      {getInitials(name)}
    </div>
  );
};

export default Avatar;
