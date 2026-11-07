import React, { useEffect, useRef, useState } from 'react';
import Icon, { IconName } from './Icon';

export interface MenuAction {
  label: string;
  icon?: IconName;
  onSelect: () => void;
  danger?: boolean;
  disabled?: boolean;
}

// Fecha um menu ou painel ao clicar fora e com Esc (antes de qualquer diálogo por trás)
export const useDismiss = (open: boolean, close: () => void, refs: React.RefObject<HTMLElement | null>[]) => {
  const closeRef = useRef(close);
  closeRef.current = close;
  useEffect(() => {
    if (!open) return;
    const onDown = (e: MouseEvent | TouchEvent) => {
      if (!refs.some(r => r.current?.contains(e.target as Node))) closeRef.current();
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key !== 'Escape') return;
      e.stopPropagation();
      closeRef.current();
    };
    document.addEventListener('mousedown', onDown);
    document.addEventListener('touchstart', onDown);
    document.addEventListener('keydown', onKey, true);
    return () => {
      document.removeEventListener('mousedown', onDown);
      document.removeEventListener('touchstart', onDown);
      document.removeEventListener('keydown', onKey, true);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);
};

// Setas e Home/End entre as opções de um menu
export const moveFocus = (e: React.KeyboardEvent, container: HTMLElement | null) => {
  if (!container || !['ArrowDown', 'ArrowUp', 'Home', 'End'].includes(e.key)) return;
  const items = Array.from(container.querySelectorAll<HTMLElement>('[role^="menuitem"]:not([disabled])'));
  if (!items.length) return;
  e.preventDefault();
  const index = items.indexOf(document.activeElement as HTMLElement);
  const next = e.key === 'Home' ? 0
    : e.key === 'End' ? items.length - 1
    : e.key === 'ArrowDown' ? (index + 1) % items.length
    : (index - 1 + items.length) % items.length;
  items[next].focus();
};

/** Menu "mais opções" (⋯) de uma publicação, pedido ou evento. Sem ações, não aparece. */
const MoreMenu: React.FC<{ actions: MenuAction[]; label?: string }> = ({ actions, label = 'Mais opções' }) => {
  const [open, setOpen] = useState(false);
  const button = useRef<HTMLButtonElement>(null);
  const menu = useRef<HTMLDivElement>(null);

  const close = (refocus = true) => {
    setOpen(false);
    if (refocus) button.current?.focus();
  };

  useDismiss(open, () => close(), [button, menu]);

  useEffect(() => {
    if (open) menu.current?.querySelector<HTMLElement>('[role="menuitem"]:not([disabled])')?.focus();
  }, [open]);

  if (!actions.length) return null;

  return (
    <div className="menu-wrap">
      <button ref={button} type="button" className="action-btn" aria-label={label} title={label}
        aria-haspopup="menu" aria-expanded={open} onClick={() => setOpen(v => !v)}>
        <Icon name="more" />
      </button>
      {open && (
        <div ref={menu} className="menu is-end scale-in" role="menu" aria-label={label}
          onKeyDown={e => { moveFocus(e, menu.current); if (e.key === 'Tab') close(false); }}>
          {actions.map(action => (
            <button key={action.label} type="button" role="menuitem" disabled={action.disabled}
              className={`menu-item${action.danger ? ' is-danger' : ''}`}
              onClick={() => { close(); action.onSelect(); }}>
              {action.icon && <Icon name={action.icon} size={18} />}
              {action.label}
            </button>
          ))}
        </div>
      )}
    </div>
  );
};

export default MoreMenu;
