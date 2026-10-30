import React from 'react';

interface PageHeaderProps {
  icon?: string;
  title: string;
  subtitle?: React.ReactNode;
  actions?: React.ReactNode;
}

/** Cabeçalho padrão das páginas: ícone, título, subtítulo e ações à direita. */
const PageHeader: React.FC<PageHeaderProps> = ({ icon, title, subtitle, actions }) => (
  <div className="page-header">
    <div>
      <div className="page-title-row">
        {icon && <span className="page-icon" uk-icon={`icon: ${icon}; ratio: 1.05`}></span>}
        <h1 className="page-title">{title}</h1>
      </div>
      {subtitle && <p className="page-subtitle">{subtitle}</p>}
    </div>
    {actions && <div className="page-actions">{actions}</div>}
  </div>
);

export default PageHeader;
