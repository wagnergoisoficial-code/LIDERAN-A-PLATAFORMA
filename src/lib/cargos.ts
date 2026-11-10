export type Cargo = 'secretario' | 'tesoureiro' | 'regente';
export type Area = 'lideranca' | Cargo;

interface PanelUser { role?: string; cargo?: Cargo | null; churchId?: string | null }

export const CARGOS: { value: Cargo; label: string; area: string }[] = [
  { value: 'secretario', label: 'Secretário(a)', area: 'Secretaria' },
  { value: 'tesoureiro', label: 'Tesoureiro(a)', area: 'Tesouraria' },
  { value: 'regente', label: 'Regente', area: 'Regência' },
];

export const cargoLabel = (cargo?: string | null) => CARGOS.find(c => c.value === cargo)?.label || '';

export const isLeader = (user?: PanelUser | null) => user?.role === 'leader' || user?.role === 'admin';

/** A liderança entra em todas as áreas; quem tem cargo, só na sua. */
export const canOpen = (user: PanelUser | null | undefined, area: Area) =>
  isLeader(user) || (area !== 'lideranca' && user?.cargo === area && !!user?.churchId);

export const hasPanel = (user?: PanelUser | null) => isLeader(user) || !!(user?.cargo && user.churchId);

export const panelLabel = (user?: PanelUser | null) =>
  isLeader(user) ? 'Painel do líder' : `Painel da ${(CARGOS.find(c => c.value === user?.cargo)?.area || '').toLowerCase()}`;
