import React from 'react';
import { dayLabel } from '../lib/format';

/** Dia e mês de um encontro, em texto (sem caixa colorida). */
const DateChip: React.FC<{ date: string }> = ({ date }) => {
  const d = new Date(date);
  return (
    <span className="date-chip" role="img" aria-label={dayLabel(d)}>
      <span className="date-chip-day" aria-hidden="true">{d.getDate()}</span>
      <span className="date-chip-month" aria-hidden="true">{d.toLocaleDateString('pt-BR', { month: 'short' }).replace('.', '')}</span>
    </span>
  );
};

export default DateChip;
