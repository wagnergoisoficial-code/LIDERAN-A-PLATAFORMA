import React, { useState } from 'react';

interface AvatarProps {
  name: string;
  profileImage?: string | null;
  // Em píxeis, ou um dos tamanhos antigos
  size?: 'small' | 'medium' | 'large' | number;
  className?: string;
}

const NAMED_SIZES = { small: 32, medium: 44, large: 64 };

// Sem foto: as iniciais sobre uma cor viva, sempre a mesma para a mesma pessoa
// (as claras levam letras escuras, para se lerem)
const COLORS: [string, string][] = [
  ['#dc2626', '#fff'], // vermelho
  ['#e11d48', '#fff'], // carmim
  ['#db2777', '#fff'], // rosa
  ['#f9a8d4', '#500724'], // rosa-claro
  ['#c2410c', '#fff'], // laranja
  ['#fb923c', '#431407'], // laranja-claro
  ['#92400e', '#fff'], // castanho
  ['#facc15', '#3f2d00'], // amarelo
  ['#a3e635', '#1a2e05'], // lima
  ['#15803d', '#fff'], // verde
  ['#047857', '#fff'], // esmeralda
  ['#0f766e', '#fff'], // verde-água
  ['#0e7490', '#fff'], // ciano
  ['#0369a1', '#fff'], // azul-céu
  ['#2563eb', '#fff'], // azul
  ['#475569', '#fff'], // ardósia
];
const colorFor = (name: string) => {
  let hash = 0;
  for (const ch of name) hash = (hash * 31 + ch.charCodeAt(0)) >>> 0;
  return COLORS[hash % COLORS.length];
};

const getInitials = (name: string): string => {
  if (!name) return '?';
  const parts = name.trim().split(/\s+/);
  const letters = parts.length > 1 ? parts[0][0] + parts[parts.length - 1][0] : parts[0].slice(0, 1);
  return letters.toUpperCase() || '?';
};

const Avatar: React.FC<AvatarProps> = ({ name: nameProp, profileImage, size = 'medium', className }) => {
  const name = nameProp || '';
  // Foto que não carregou: mostra as iniciais (volta a tentar se a foto mudar)
  const [failedSrc, setFailedSrc] = useState<string | null>(null);
  const px = typeof size === 'number' ? size : NAMED_SIZES[size];
  const style: React.CSSProperties = { width: px, height: px, flexShrink: 0, borderRadius: '50%' };
  const classes = `avatar-circle${className ? ` ${className}` : ''}`;

  if (profileImage && failedSrc !== profileImage) {
    return (
      <img
        src={profileImage}
        alt=""
        className={classes}
        style={{ ...style, display: 'block', objectFit: 'cover', background: 'var(--bg-elevated)' }}
        onError={() => setFailedSrc(profileImage)}
        loading="lazy"
        decoding="async"
      />
    );
  }

  return (
    <span
      className={classes}
      aria-hidden="true"
      style={{
        ...style,
        display: 'inline-flex',
        alignItems: 'center',
        justifyContent: 'center',
        background: colorFor(name)[0],
        color: colorFor(name)[1],
        fontSize: Math.max(11, Math.round(px * 0.36)),
        fontWeight: 600,
        letterSpacing: '0.02em',
        userSelect: 'none',
      }}
    >
      {getInitials(name)}
    </span>
  );
};

export default Avatar;
