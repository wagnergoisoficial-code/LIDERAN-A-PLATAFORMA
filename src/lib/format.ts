// Datas e textos curtos em pt-BR, iguais em toda a app

const MINUTE = 60_000;
const HOUR = 60 * MINUTE;
const DAY = 24 * HOUR;

/** "agora", "há 5 min", "há 3 h", "ontem", "12 de out." (com o ano se não for o atual). */
export const timeAgo = (value: string | Date) => {
  const date = new Date(value);
  const diff = Date.now() - date.getTime();
  if (diff < MINUTE) return 'agora';
  if (diff < HOUR) return `há ${Math.floor(diff / MINUTE)} min`;
  if (diff < DAY) return `há ${Math.floor(diff / HOUR)} h`;
  if (diff < 2 * DAY) return 'ontem';
  if (diff < 7 * DAY) return `há ${Math.floor(diff / DAY)} dias`;
  const sameYear = date.getFullYear() === new Date().getFullYear();
  return date.toLocaleDateString('pt-BR', { day: 'numeric', month: 'short', ...(sameYear ? {} : { year: 'numeric' }) });
};

/** Data e hora completas, para o title (passar o rato) das datas relativas. */
export const fullDate = (value: string | Date) =>
  new Date(value).toLocaleString('pt-BR', { dateStyle: 'long', timeStyle: 'short' });

export const timeOnly = (value: string | Date) =>
  new Date(value).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });

/** "sáb., 8 de nov." */
export const dayLabel = (value: string | Date) =>
  new Date(value).toLocaleDateString('pt-BR', { weekday: 'short', day: 'numeric', month: 'short' });

/** Hora se for hoje, senão dia e mês (listas de conversas). */
export const shortTime = (value: string | Date) => {
  const date = new Date(value);
  return date.toDateString() === new Date().toDateString()
    ? timeOnly(date)
    : date.toLocaleDateString('pt-BR', { day: 'numeric', month: 'short' });
};

export const plural = (count: number, one: string, many: string) => `${count} ${count === 1 ? one : many}`;

export const firstName = (name?: string | null) => (name || '').trim().split(/\s+/)[0] || 'Membro';

export const roleLabel = (role?: string) =>
  role === 'admin' ? 'Administrador' : role === 'leader' ? 'Líder' : role === 'guardian' ? 'Responsável' : 'Membro';

/** ["domingo", "quarta"] → "domingo e quarta" */
export const listDays = (days?: string[] | null) => {
  const list = days || [];
  if (list.length <= 1) return list.join('');
  return `${list.slice(0, -1).join(', ')} e ${list[list.length - 1]}`;
};
