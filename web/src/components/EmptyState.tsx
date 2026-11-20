import React from 'react';
import Icon, { IconName } from './Icon';

interface EmptyStateProps {
  icon: IconName;
  title: string;
  text?: React.ReactNode;
  action?: React.ReactNode;
}

/** Estado vazio: ícone neutro, o que falta e, quando faz sentido, o que fazer a seguir. */
const EmptyState: React.FC<EmptyStateProps> = ({ icon, title, text, action }) => (
  <div className="empty-state">
    <span className="empty-state-icon"><Icon name={icon} size={36} strokeWidth={1.5} /></span>
    <p className="empty-state-title">{title}</p>
    {text && <p className="empty-state-text">{text}</p>}
    {action && <div className="empty-state-action">{action}</div>}
  </div>
);

export default EmptyState;
