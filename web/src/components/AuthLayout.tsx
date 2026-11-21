import React, { useEffect, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import jovens480 from '../assets/auth-jovens-480.webp';
import jovens840 from '../assets/auth-jovens-840.webp';
import Icon from './Icon';
import { prefersReducedMotion } from '../lib/motion';

interface AuthLayoutProps {
  title: string;
  subtitle: React.ReactNode;
  // Ligação no painel da foto, como o "Empezar Ahora" da referência
  cta?: { to: string; label: string };
  children: React.ReactNode;
}

const HEADLINE = 'A comunidade jovem que te conecta com';
const ENDINGS = ['seus irmãos da igreja.', 'quem ora por você.', 'sua geração.'];
const FEATURES = [
  'Peça oração e veja quem está orando por você.',
  'Confirme presença nos encontros com um toque.',
  'Leia o devocional do dia com sua comunidade.',
  'Converse com o grupo sem sair da Fourux.',
];
const REACTIONS = ['heart', 'praying', 'amen', 'fire', 'heart', 'strong'] as const;

// A entrada do painel corre só na primeira visita: entre entrar e criar conta muda só o formulário
let introPlayed = false;

// Conta as trocas a cada `ms` (parado com movimento reduzido)
function useTicker(ms: number, delay: number) {
  const [tick, setTick] = useState(0);
  useEffect(() => {
    if (prefersReducedMotion()) return;
    let interval = 0;
    const start = window.setTimeout(() => {
      setTick((t) => t + 1);
      interval = window.setInterval(() => setTick((t) => t + 1), ms);
    }, delay);
    return () => {
      window.clearTimeout(start);
      window.clearInterval(interval);
    };
  }, [ms, delay]);
  return tick;
}

// O texto que sai e o que entra ocupam a mesma célula; só os leitores de ecrã ficam de fora
const Rotator = ({ items, tick, className }: { items: string[]; tick: number; className: string }) => (
  <span className={className} aria-hidden="true">
    {tick > 0 && (
      <span key={`out-${tick}`} className="auth-rotator-item is-out">{items[(tick - 1) % items.length]}</span>
    )}
    <span key={`in-${tick}`} className={`auth-rotator-item${tick > 0 ? ' is-in' : ''}`}>{items[tick % items.length]}</span>
  </span>
);

const AuthVisual = ({ cta }: { cta?: AuthLayoutProps['cta'] }) => {
  const ref = useRef<HTMLElement>(null);
  const frame = useRef(0);
  const ending = useTicker(2800, 2400);
  const feature = useTicker(3600, 4200);

  // Profundidade: o grupo acompanha o rato alguns píxeis (só com rato e movimento normal)
  const follow = (e: React.PointerEvent<HTMLElement>) => {
    if (e.pointerType !== 'mouse' || prefersReducedMotion()) return;
    const el = ref.current;
    if (!el) return;
    cancelAnimationFrame(frame.current);
    frame.current = requestAnimationFrame(() => {
      const r = el.getBoundingClientRect();
      el.style.setProperty('--mx', (((e.clientX - r.left) / r.width) * 2 - 1).toFixed(3));
      el.style.setProperty('--my', (((e.clientY - r.top) / r.height) * 2 - 1).toFixed(3));
    });
  };

  useEffect(() => () => cancelAnimationFrame(frame.current), []);

  return (
    <aside className="auth-visual" ref={ref} onPointerMove={follow} aria-label="Sobre a Fourux">
      <span className="auth-visual-brand" aria-hidden="true">fourux</span>
      <div className="auth-visual-copy">
        <h2 className="auth-visual-title">
          <span className="visually-hidden">{`${HEADLINE} ${ENDINGS[0]}`}</span>
          <span aria-hidden="true">
            {HEADLINE.split(' ').map((word, i) => (
              <React.Fragment key={i}>
                <span className="auth-word">
                  <span style={{ '--w': i } as React.CSSProperties}>{word}</span>
                </span>{' '}
              </React.Fragment>
            ))}
          </span>
          <Rotator items={ENDINGS} tick={ending} className="auth-rotator auth-visual-ending" />
        </h2>
        <p className="auth-visual-text">
          Feed, pedidos de oração, encontros e conversas da sua igreja, em um só lugar.
        </p>
        {cta && (
          <Link className="auth-visual-cta" to={cta.to}>
            {cta.label}
            <Icon name="chevron-right" size={18} strokeWidth={2} />
          </Link>
        )}
        <p className="auth-visual-live">
          <span className="auth-live-dot" aria-hidden="true" />
          <span className="visually-hidden">{FEATURES[0]}</span>
          <Rotator items={FEATURES} tick={feature} className="auth-rotator" />
        </p>
      </div>

      <div className="auth-stage" aria-hidden="true">
        <div className="auth-crowd">
          <img
            src={jovens840.src}
            srcSet={`${jovens480.src} 480w, ${jovens840.src} 840w`}
            sizes="(max-width: 899px) 200px, 840px"
            width={840}
            height={1050}
            alt=""
            decoding="async"
          />
          <div className="auth-reactions">
            {REACTIONS.map((name, i) => (
              <span className="auth-reaction" key={i} style={{ '--i': i } as React.CSSProperties}>
                <Icon name={name} size={22} strokeWidth={2} />
              </span>
            ))}
          </div>
        </div>
      </div>
    </aside>
  );
};

// Entrar e criar conta: o formulário à esquerda e o painel da foto à direita, como na referência.
// No telemóvel o painel vira uma faixa por cima do formulário.
const AuthLayout = ({ title, subtitle, cta, children }: AuthLayoutProps) => {
  const intro = useRef(!introPlayed);
  useEffect(() => {
    introPlayed = true;
  }, []);

  return (
    <div className={`auth${intro.current ? ' is-intro' : ''}`}>
      <main className="auth-side">
        <span className="auth-brand">fourux</span>
        <div className="auth-form">
          <h1 className="auth-title">{title}</h1>
          <p className="auth-subtitle">{subtitle}</p>
          {children}
        </div>
        <p className="auth-legal">© {new Date().getFullYear()} Fourux. Todos os direitos reservados.</p>
      </main>
      <AuthVisual cta={cta} />
    </div>
  );
};

interface PasswordInputProps {
  id: string;
  name: string;
  value: string;
  onChange: (value: string) => void;
  autoComplete: 'current-password' | 'new-password';
  visible: boolean;
  placeholder?: string;
  // Com onToggle, o campo mostra o botão "Mostrar"; toggleControls lista os campos que ele revela
  onToggle?: () => void;
  toggleControls?: string;
  describedBy?: string;
}

export const PasswordInput = ({
  id,
  name,
  value,
  onChange,
  autoComplete,
  visible,
  placeholder,
  onToggle,
  toggleControls,
  describedBy,
}: PasswordInputProps) => (
  <div className={`auth-password${onToggle ? ' has-reveal' : ''}`}>
    <input
      id={id}
      name={name}
      className="uk-input"
      type={visible ? 'text' : 'password'}
      autoComplete={autoComplete}
      placeholder={placeholder}
      value={value}
      onChange={(e) => onChange(e.target.value)}
      aria-describedby={describedBy}
      minLength={autoComplete === 'new-password' ? 8 : undefined}
      required
    />
    {onToggle && (
      <button
        type="button"
        className="auth-reveal"
        onClick={onToggle}
        aria-pressed={visible}
        aria-controls={toggleControls || id}
        aria-label={visible ? 'Ocultar senha' : 'Mostrar senha'}
      >
        {visible ? 'Ocultar' : 'Mostrar'}
      </button>
    )}
  </div>
);

export default AuthLayout;
