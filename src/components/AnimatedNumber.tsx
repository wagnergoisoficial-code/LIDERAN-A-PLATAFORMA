import React, { useEffect, useRef } from 'react';

// Número que "rola" na direção da mudança (sobe ao aumentar, desce ao diminuir).
// Não anima na primeira renderização: só quando o valor muda.
const AnimatedNumber: React.FC<{ value: number; className?: string }> = ({ value, className }) => {
  const previous = useRef(value);
  const direction = useRef<'up' | 'down' | null>(null);

  // A direção só muda quando o valor muda, para outras renderizações não repetirem a animação
  if (previous.current !== value) direction.current = value < previous.current ? 'down' : 'up';

  useEffect(() => { previous.current = value; }, [value]);

  const classes = [
    direction.current ? 'num-roll' : '',
    direction.current === 'down' ? 'is-down' : '',
    className || '',
  ].filter(Boolean).join(' ');

  return <span key={value} className={classes || undefined}>{value}</span>;
};

export default AnimatedNumber;
