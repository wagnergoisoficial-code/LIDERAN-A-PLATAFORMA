import React from 'react';
import { useToast } from '../context/ToastContext';

const icons: Record<string, string> = {
  success: 'check',
  error: 'warning',
  info: 'info',
  warning: 'warning',
};

// Avisos neutros: o tipo é indicado pelo ícone, não pela cor
const colors: Record<string, { bg: string; border: string; icon: string }> = {
  success: { bg: 'var(--bg)', border: 'var(--border-strong)', icon: 'var(--text)' },
  error:   { bg: 'var(--bg)', border: 'var(--border-strong)', icon: 'var(--text)' },
  info:    { bg: 'var(--bg)', border: 'var(--border-strong)', icon: 'var(--text)' },
  warning: { bg: 'var(--bg)', border: 'var(--border-strong)', icon: 'var(--text)' },
};

const ToastContainer: React.FC = () => {
  const { toasts, dismiss } = useToast();

  if (!toasts.length) return null;

  return (
    <div style={{ position: 'fixed', top: '72px', right: '16px', zIndex: 99999, display: 'flex', flexDirection: 'column', gap: '8px', pointerEvents: 'none' }}>
      {toasts.map(t => {
        const c = colors[t.type];
        return (
          <div
            key={t.id}
            className="toast-item"
            style={{
              background: c.bg,
              border: `1px solid ${c.border}`,
              borderRadius: 'var(--radius)',
              padding: '10px 14px',
              display: 'flex',
              alignItems: 'center',
              gap: '10px',
              minWidth: '260px',
              maxWidth: '360px',
              pointerEvents: 'all',
              cursor: 'pointer',
            }}
            onClick={() => dismiss(t.id)}
          >
            <span uk-icon={`icon: ${icons[t.type]}; ratio: 0.85`} style={{ color: c.icon, flexShrink: 0 }}></span>
            <span style={{ fontSize: '13px', color: 'var(--text)', flex: 1, lineHeight: 1.4 }}>{t.message}</span>
          </div>
        );
      })}
    </div>
  );
};

export default ToastContainer;
