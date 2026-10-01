// Cálculo das estatísticas de estudo. Tudo em função do fuso horário de quem
// vê: "hoje" e "dias seguidos" dependem de onde o utilizador está.

/** Uma revisão: [segundos desde 1970, resposta 1–4]. */
export type ReviewPoint = [at: number, rating: number];

export type DayCount = { key: string; date: Date; count: number };

export type StudyStats = {
  today: number;
  /** Dias seguidos com pelo menos uma revisão, a contar de hoje (ou de ontem, se hoje ainda não houve). */
  streak: number;
  /** Revisões nos últimos 30 dias e quantas não foram "Errei". */
  reviews30: number;
  correct30: number;
  daily: DayCount[];
  forecast: DayCount[];
};

const DAY_MS = 24 * 60 * 60 * 1000;

/** Dia de calendário ("2026-10-01") de um instante num fuso horário. */
export function dayKey(date: Date, timeZone: string) {
  // O formato en-CA é AAAA-MM-DD.
  return new Intl.DateTimeFormat("en-CA", { timeZone, year: "numeric", month: "2-digit", day: "2-digit" }).format(date);
}

/** Soma dias a um dia de calendário, sem depender de fusos nem de mudanças de hora. */
export function addDays(key: string, days: number) {
  const [y, m, d] = key.split("-").map(Number);
  return new Date(Date.UTC(y, m - 1, d + days)).toISOString().slice(0, 10);
}

// Meio-dia UTC: ao formatar a data, qualquer fuso mostra o mesmo dia.
const keyToDate = (key: string) => new Date(`${key}T12:00:00Z`);

export function computeStats(
  reviews: ReviewPoint[],
  /** Datas de vencimento (ms) dos cards que vencem até ao fim da previsão. */
  dues: number[],
  now: Date,
  timeZone: string,
  { historyDays = 14, forecastDays = 7 } = {},
): StudyStats {
  const todayKey = dayKey(now, timeZone);

  const perDay = new Map<string, number>();
  let reviews30 = 0;
  let correct30 = 0;
  const since30 = now.getTime() - 30 * DAY_MS;
  for (const [at, rating] of reviews) {
    const ms = at * 1000;
    const key = dayKey(new Date(ms), timeZone);
    perDay.set(key, (perDay.get(key) ?? 0) + 1);
    if (ms >= since30) {
      reviews30++;
      if (rating > 1) correct30++;
    }
  }

  // Hoje sem revisões ainda não quebra a sequência: conta a partir de ontem.
  let streak = 0;
  let cursor = perDay.has(todayKey) ? todayKey : addDays(todayKey, -1);
  while (perDay.has(cursor)) {
    streak++;
    cursor = addDays(cursor, -1);
  }

  const daily: DayCount[] = [];
  for (let i = historyDays - 1; i >= 0; i--) {
    const key = addDays(todayKey, -i);
    daily.push({ key, date: keyToDate(key), count: perDay.get(key) ?? 0 });
  }

  // Cards atrasados contam em "hoje".
  const duePerDay = new Map<string, number>();
  for (const due of dues) {
    const key = dayKey(new Date(Math.max(due, now.getTime())), timeZone);
    duePerDay.set(key, (duePerDay.get(key) ?? 0) + 1);
  }
  const forecast: DayCount[] = [];
  for (let i = 0; i < forecastDays; i++) {
    const key = addDays(todayKey, i);
    forecast.push({ key, date: keyToDate(key), count: duePerDay.get(key) ?? 0 });
  }

  return { today: perDay.get(todayKey) ?? 0, streak, reviews30, correct30, daily, forecast };
}
