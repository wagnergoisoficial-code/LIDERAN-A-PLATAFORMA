import React from 'react';
import jovens480 from '../assets/auth-jovens-480.webp';
import jovens840 from '../assets/auth-jovens-840.webp';

interface AuthLayoutProps {
  title: string;
  subtitle: string;
  footer: React.ReactNode;
  children: React.ReactNode;
}

// Login e cadastro: a foto pequena à esquerda e o formulário à direita, juntos ao centro,
// sem cartões nem bordas. No telemóvel fica só o formulário.
const AuthLayout = ({ title, subtitle, footer, children }: AuthLayoutProps) => (
  <div className="auth">
    <div className="auth-inner">
      <div className="auth-art">
        {/* lazy: escondida no telemóvel, assim nem chega a ser descarregada */}
        <img
          src={jovens840}
          srcSet={`${jovens480} 480w, ${jovens840} 840w`}
          sizes="420px"
          width={840}
          height={1050}
          alt=""
          loading="lazy"
          decoding="async"
        />
      </div>

      <main className="auth-panel">
        <div className="auth-form">
          <span className="auth-brand">ICHURCH</span>
          <h1 className="auth-title">{title}</h1>
          <p className="auth-subtitle">{subtitle}</p>
          {children}
          <p className="auth-switch">{footer}</p>
        </div>
      </main>
    </div>
  </div>
);

interface PasswordInputProps {
  id: string;
  name: string;
  value: string;
  onChange: (value: string) => void;
  autoComplete: 'current-password' | 'new-password';
  visible: boolean;
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
