import React from 'react';

export interface GuardianDraft {
  mode: 'new' | 'existing';
  name: string;
  email: string;
  password: string;
  relationship: string;
}

export const EMPTY_GUARDIAN: GuardianDraft = { mode: 'new', name: '', email: '', password: '', relationship: 'mae' };

const RELATIONSHIPS = [
  { value: 'mae', label: 'Mãe' },
  { value: 'pai', label: 'Pai' },
  { value: 'tutor', label: 'Tutor legal' },
  { value: 'outro', label: 'Outro' },
];

export const relationshipLabel = (value?: string | null) =>
  RELATIONSHIPS.find(r => r.value === value)?.label || 'Responsável';

// Idade a partir da data de nascimento (yyyy-mm-dd); null se a data for inválida
export const ageFromDate = (value: string) => {
  if (!value) return null;
  const birth = new Date(`${value}T00:00:00`);
  if (Number.isNaN(birth.getTime())) return null;
  const now = new Date();
  let age = now.getFullYear() - birth.getFullYear();
  if (now.getMonth() < birth.getMonth() || (now.getMonth() === birth.getMonth() && now.getDate() < birth.getDate())) age -= 1;
  return age;
};

export const isMinorDate = (value: string) => {
  const age = ageFromDate(value);
  return age !== null && age < 18;
};

export const guardianPayload = (g: GuardianDraft) =>
  g.mode === 'existing'
    ? { email: g.email.trim(), relationship: g.relationship }
    : { name: g.name.trim(), email: g.email.trim(), password: g.password, relationship: g.relationship };

export const todayInput = () => new Date().toISOString().slice(0, 10);

interface GuardianFieldsProps {
  value: GuardianDraft;
  onChange: (value: GuardianDraft) => void;
  // Texto curto acima dos campos (por omissão explica a autorização dos pais)
  intro?: string;
}

// Responsável de um membro menor de idade: conta nova ou uma conta de responsável que já existe
const GuardianFields: React.FC<GuardianFieldsProps> = ({ value, onChange, intro }) => {
  const set = (patch: Partial<GuardianDraft>) => onChange({ ...value, ...patch });

  return (
    <div className="guardian-fields">
      <div>
        <div className="list-label" style={{ marginBottom: '4px' }}>Responsável</div>
        <p style={{ margin: 0, fontSize: '12px', color: 'var(--text-muted)', lineHeight: 1.5 }}>
          {intro || 'Menores de 18 anos precisam de um responsável. A conta só fica ativa depois da autorização dos pais.'}
        </p>
      </div>

      <div className="guardian-mode" role="radiogroup" aria-label="Conta do responsável">
        {([['new', 'Criar conta do responsável'], ['existing', 'Já tem conta de responsável']] as const).map(([mode, label]) => (
          <label key={mode} className={value.mode === mode ? 'is-selected' : ''}>
            <input type="radio" name="guardian-mode" value={mode} checked={value.mode === mode} onChange={() => set({ mode })} />
            {label}
          </label>
        ))}
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
        {value.mode === 'new' && (
          <div style={{ gridColumn: '1 / -1' }}>
            <label className="form-label" htmlFor="guardian-name">Nome do responsável</label>
            <input id="guardian-name" className="form-input" type="text" value={value.name} onChange={e => set({ name: e.target.value })} required />
          </div>
        )}
        <div>
          <label className="form-label" htmlFor="guardian-email">E-mail do responsável</label>
          <input id="guardian-email" className="form-input" type="email" value={value.email} onChange={e => set({ email: e.target.value })} required />
        </div>
        <div>
          <label className="form-label" htmlFor="guardian-relationship">Parentesco</label>
          <select id="guardian-relationship" className="uk-select" value={value.relationship} onChange={e => set({ relationship: e.target.value })}>
            {RELATIONSHIPS.map(r => <option key={r.value} value={r.value}>{r.label}</option>)}
          </select>
        </div>
        {value.mode === 'new' && (
          <div style={{ gridColumn: '1 / -1' }}>
            <label className="form-label" htmlFor="guardian-password">Senha inicial do responsável</label>
            <input id="guardian-password" className="form-input" type="password" placeholder="8+ caracteres, Aa e número" minLength={8}
              value={value.password} onChange={e => set({ password: e.target.value })} required />
          </div>
        )}
      </div>
    </div>
  );
};

export default GuardianFields;
