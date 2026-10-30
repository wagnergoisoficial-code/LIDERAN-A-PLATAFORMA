import React from 'react';

interface EmptyStateProps {
  icon: string;
  title: string;
  text?: React.ReactNode;
}

/** Estado vazio padrão (mesmo cartão, ícone neutro e textos em todas as páginas). */
const EmptyState: React.FC<EmptyStateProps> = ({ icon, title, text }) => (
  <div className="empty-state">
    <span className="empty-state-icon" uk-icon={`icon: ${icon}; ratio: 2.2`}></span>
    <p className="empty-state-title">{title}</p>
    {text && <p className="empty-state-text">{text}</p>}
  </div>
);

export default EmptyState;
