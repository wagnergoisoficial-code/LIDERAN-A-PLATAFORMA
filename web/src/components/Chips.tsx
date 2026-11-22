import React from 'react';

export interface Chip {
  key: string;
  label: React.ReactNode;
  // O texto que entra no campo ao tocar
  text: string;
  title?: string;
}

// Fila de textos prontos: um toque cola o texto no campo. O mousedown não tira o foco do campo
const Chips = ({ items, onPick, label, className = '' }: { items: Chip[]; onPick: (text: string) => void; label: string; className?: string }) => (
  <div className={`chips${className ? ` ${className}` : ''}`} role="group" aria-label={label}>
    {items.map((item) => (
      <button key={item.key} type="button" className="chip press" title={item.title}
        onMouseDown={(e) => e.preventDefault()} onClick={() => onPick(item.text)}>
        {item.label}
      </button>
    ))}
  </div>
);

export default Chips;
