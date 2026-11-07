import React, { useEffect, useId, useRef } from 'react';
import { createPortal } from 'react-dom';
import Icon from './Icon';

// Diálogos abertos, do mais antigo ao mais recente: só o de cima responde ao Esc e ao Tab
const openDialogs: number[] = [];
let nextId = 0;

const FOCUSABLE = 'a[href], button:not([disabled]), input:not([disabled]):not([type="hidden"]), select:not([disabled]), textarea:not([disabled]), iframe, [tabindex]:not([tabindex="-1"])';

interface ModalProps {
  title: React.ReactNode;
  onClose: () => void;
  children: React.ReactNode;
  width?: number;
  footer?: React.ReactNode;
  // media: foto em ecrã inteiro
  variant?: 'media';
  hideTitle?: boolean;
  // Com onSubmit, a caixa é um <form> (Enter envia)
  onSubmit?: (e: React.FormEvent) => void;
}

/**
 * Diálogo acessível: foco dentro da caixa, Esc fecha, a página por trás não rola e,
 * ao fechar, o foco volta ao controlo que o abriu. Para focar um campo ao abrir,
 * marque-o com data-autofocus.
 */
const Modal: React.FC<ModalProps> = ({ title, onClose, children, width = 520, footer, variant, hideTitle, onSubmit }) => {
  const boxRef = useRef<HTMLDivElement & HTMLFormElement>(null);
  const closeRef = useRef(onClose);
  closeRef.current = onClose;
  const titleId = useId();

  useEffect(() => {
    const id = ++nextId;
    openDialogs.push(id);
    const opener = document.activeElement as HTMLElement | null;
    const box = boxRef.current!;
    (box.querySelector<HTMLElement>('[data-autofocus]') || box).focus({ preventScroll: true });

    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';

    const onKey = (e: KeyboardEvent) => {
      if (openDialogs[openDialogs.length - 1] !== id) return;
      if (e.key === 'Escape') {
        e.preventDefault();
        closeRef.current();
        return;
      }
      if (e.key !== 'Tab') return;
      const items = Array.from(box.querySelectorAll<HTMLElement>(FOCUSABLE)).filter(el => el.offsetParent !== null);
      if (!items.length) {
        e.preventDefault();
        return;
      }
      const first = items[0];
      const last = items[items.length - 1];
      if (e.shiftKey && (document.activeElement === first || document.activeElement === box)) {
        e.preventDefault();
        last.focus();
      } else if (!e.shiftKey && document.activeElement === last) {
        e.preventDefault();
        first.focus();
      }
    };

    document.addEventListener('keydown', onKey);
    return () => {
      document.removeEventListener('keydown', onKey);
      openDialogs.splice(openDialogs.indexOf(id), 1);
      if (!openDialogs.length) document.body.style.overflow = previousOverflow;
      if (opener && document.contains(opener)) opener.focus({ preventScroll: true });
    };
  }, []);

  const Box = (onSubmit ? 'form' : 'div') as 'div';

  return createPortal(
    <div
      className={`modal-overlay${variant ? ` is-${variant}` : ''}`}
      onMouseDown={e => { if (e.target === e.currentTarget) closeRef.current(); }}
    >
      <Box
        ref={boxRef}
        className="modal-box"
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        tabIndex={-1}
        style={{ maxWidth: variant ? undefined : width }}
        {...(onSubmit ? { onSubmit } : {})}
      >
        <div className="modal-header">
          <h2 id={titleId} className={`modal-title${hideTitle ? ' visually-hidden' : ''}`}>{title}</h2>
          <button type="button" className="icon-btn modal-close-btn" onClick={() => closeRef.current()} aria-label="Fechar">
            <Icon name="close" />
          </button>
        </div>
        {children}
        {footer && <div className="modal-footer">{footer}</div>}
      </Box>
    </div>,
    document.body,
  );
};

export default Modal;
