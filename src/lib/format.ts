const MINUTE = 60_000;
const HOUR = 60 * MINUTE;
const DAY = 24 * HOUR;

/** Intervalo curto e legível: "1 min", "10 min", "3 h", "4 d", "2 m", "1,5 a". */
export function formatInterval(ms: number) {
  if (ms < HOUR) return `${Math.max(1, Math.round(ms / MINUTE))} min`;
  if (ms < DAY) return `${Math.round(ms / HOUR)} h`;
  const days = ms / DAY;
  if (days < 30) return `${Math.round(days)} d`;
  if (days < 365) return `${Math.round(days / 30)} m`;
  return `${(days / 365).toLocaleString("pt-PT", { maximumFractionDigits: 1 })} a`;
}

/** Estado de um card relativo a agora: "Para rever" ou "Daqui a 3 d". */
export function formatDue(due: string | Date, now = new Date()) {
  const diff = new Date(due).getTime() - now.getTime();
  return diff <= 0 ? "Para rever" : `Daqui a ${formatInterval(diff)}`;
}

export function isDue(due: string | Date, now = new Date()) {
  return new Date(due).getTime() <= now.getTime();
}
