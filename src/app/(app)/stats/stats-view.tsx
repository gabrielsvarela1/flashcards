"use client";

import Link from "next/link";
import { useMemo, useState, useSyncExternalStore } from "react";
import { computeStats, type DayCount, type ReviewPoint } from "@/lib/stats";

type CardCounts = { total: number; fresh: number; learning: number; mature: number };

const CHART_DAYS = 14;

const card = "rounded-2xl border border-neutral-200 bg-white p-4 dark:border-neutral-800 dark:bg-neutral-900";

// O fuso horário só se conhece no browser: no servidor fica null e mostra-se
// um esqueleto, em vez de números calculados no fuso errado.
const noop = () => () => {};
const getTimeZone = () => Intl.DateTimeFormat().resolvedOptions().timeZone;
const getServerTimeZone = () => null;

export function StatsView({
  reviews,
  dues,
  cards,
  historyDays,
  forecastDays,
}: {
  reviews: ReviewPoint[];
  dues: number[];
  cards: CardCounts;
  historyDays: number;
  forecastDays: number;
}) {
  const timeZone = useSyncExternalStore(noop, getTimeZone, getServerTimeZone);
  // Fixado na primeira renderização: as estatísticas referem-se ao momento em que a página abriu.
  const [now] = useState(() => new Date());

  const stats = useMemo(
    () => (timeZone ? computeStats(reviews, dues, now, timeZone, { historyDays: CHART_DAYS, forecastDays }) : null),
    [reviews, dues, now, timeZone, forecastDays],
  );

  if (!stats) {
    return (
      <div className="flex flex-col gap-4" aria-busy="true" aria-label="A carregar">
        <div className="h-24 animate-pulse rounded-2xl bg-neutral-100 dark:bg-neutral-900" />
        <div className="h-56 animate-pulse rounded-2xl bg-neutral-100 dark:bg-neutral-900" />
      </div>
    );
  }

  if (cards.total === 0) {
    return (
      <div className="rounded-2xl border border-dashed border-neutral-300 p-8 text-center text-neutral-500 dark:border-neutral-700">
        <p>Ainda não tens cards. As estatísticas aparecem quando começares a rever.</p>
        <Link href="/decks" className="mt-3 inline-block text-sm font-medium text-indigo-600 hover:underline dark:text-indigo-400">
          Criar um deck
        </Link>
      </div>
    );
  }

  const retention = stats.reviews30 ? Math.round((stats.correct30 / stats.reviews30) * 100) : null;
  const dueNow = stats.forecast[0]?.count ?? 0;

  return (
    <div className="flex flex-col gap-4">
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <Tile
          label="Dias seguidos"
          value={stats.streak >= historyDays ? `${historyDays}+` : String(stats.streak)}
          note={stats.streak > 0 && stats.today === 0 ? "Revê hoje para manter" : undefined}
        />
        <Tile label="Revisões hoje" value={stats.today.toLocaleString("pt-PT")} />
        <Tile
          label="Taxa de acerto"
          value={retention === null ? "—" : `${retention}%`}
          note={retention === null ? "Sem revisões em 30 dias" : "Últimos 30 dias"}
        />
        <Tile label="Para rever hoje" value={dueNow.toLocaleString("pt-PT")} />
      </div>

      <section className={card}>
        <BarChart
          title="Revisões por dia"
          subtitle={`Últimos ${CHART_DAYS} dias`}
          data={stats.daily}
          unit={["revisão", "revisões"]}
          emptyText="Sem revisões nestes dias."
        />
      </section>

      <section className={card}>
        <BarChart
          title="Cards a vencer"
          subtitle={`Próximos ${forecastDays} dias (os atrasados contam em hoje)`}
          data={stats.forecast}
          unit={["card", "cards"]}
          emptyText="Nada para rever nos próximos dias."
          todayFirst
        />
      </section>

      <section className={card}>
        <h2 className="font-medium">Os teus cards</h2>
        <p className="text-sm text-neutral-500">{cards.total.toLocaleString("pt-PT")} no total</p>
        <dl className="mt-4 flex flex-col gap-3">
          <Share label="Novos" hint="ainda por estudar" count={cards.fresh} total={cards.total} />
          <Share label="Em aprendizagem" hint="vistos há pouco ou esquecidos" count={cards.learning} total={cards.total} />
          <Share label="Consolidados" hint="em revisão espaçada" count={cards.mature} total={cards.total} />
        </dl>
      </section>
    </div>
  );
}

function Tile({ label, value, note }: { label: string; value: string; note?: string }) {
  return (
    <div className={card}>
      <p className="text-sm text-neutral-500">{label}</p>
      <p className="mt-1 text-3xl font-semibold tracking-tight">{value}</p>
      {note && <p className="mt-1 text-xs text-neutral-500">{note}</p>}
    </div>
  );
}

/** Parte de um todo: o número é a informação, a barra só dá a proporção. */
function Share({ label, hint, count, total }: { label: string; hint: string; count: number; total: number }) {
  const percent = total ? (count / total) * 100 : 0;
  return (
    <div>
      <div className="flex items-baseline justify-between gap-3">
        <dt className="text-sm">
          {label} <span className="text-neutral-500">· {hint}</span>
        </dt>
        <dd className="text-sm font-semibold tabular-nums">{count.toLocaleString("pt-PT")}</dd>
      </div>
      <div className="mt-1.5 h-2 overflow-hidden rounded-full bg-indigo-100 dark:bg-indigo-950" aria-hidden>
        <div className="h-full rounded-full bg-indigo-600 dark:bg-indigo-500" style={{ width: `${percent}%` }} />
      </div>
    </div>
  );
}

const weekday = new Intl.DateTimeFormat("pt-PT", { weekday: "short", timeZone: "UTC" });
const dayMonth = new Intl.DateTimeFormat("pt-PT", { day: "numeric", month: "short", timeZone: "UTC" });
const fullDate = new Intl.DateTimeFormat("pt-PT", { weekday: "long", day: "numeric", month: "long", timeZone: "UTC" });

/** Eixo com um máximo "redondo": 1, 2, 5, 10, 20, 50… */
function niceMax(max: number) {
  if (max <= 4) return 4;
  const magnitude = 10 ** Math.floor(Math.log10(max));
  return [1, 2, 5, 10].map((m) => m * magnitude).find((v) => v >= max)!;
}

function BarChart({
  title,
  subtitle,
  data,
  unit,
  emptyText,
  todayFirst = false,
}: {
  title: string;
  subtitle: string;
  data: DayCount[];
  unit: [singular: string, plural: string];
  emptyText: string;
  todayFirst?: boolean;
}) {
  const todayIndex = todayFirst ? 0 : data.length - 1;
  const [selected, setSelected] = useState<number | null>(null);
  const active = data[selected ?? todayIndex];
  const top = niceMax(Math.max(...data.map((d) => d.count)));
  const total = data.reduce((sum, d) => sum + d.count, 0);
  const describe = (d: DayCount) => `${d.count.toLocaleString("pt-PT")} ${d.count === 1 ? unit[0] : unit[1]}`;
  // Com muitas barras, mostra uma etiqueta sim, outra não.
  const labelEvery = data.length > 8 ? 2 : 1;

  return (
    <figure className="flex flex-col gap-4">
      <figcaption className="flex items-start justify-between gap-3">
        <div>
          <h2 className="font-medium">{title}</h2>
          <p className="text-sm text-neutral-500">{subtitle}</p>
        </div>
        {/* Leitura do dia selecionado: é o "tooltip", sempre visível e utilizável no telemóvel. */}
        <p className="shrink-0 text-right text-sm" aria-live="polite">
          <span className="block font-semibold">{describe(active)}</span>
          <span className="block text-neutral-500">
            {(selected ?? todayIndex) === todayIndex ? "hoje" : `${weekday.format(active.date)}, ${dayMonth.format(active.date)}`}
          </span>
        </p>
      </figcaption>

      {total === 0 ? (
        <p className="py-8 text-center text-sm text-neutral-500">{emptyText}</p>
      ) : (
        <div className="flex gap-2">
          <div className="flex h-36 flex-col justify-between text-right text-xs tabular-nums text-neutral-500" aria-hidden>
            <span className="-translate-y-1/2">{top}</span>
            <span className="translate-y-1/2">0</span>
          </div>
          <div className="min-w-0 flex-1">
            <div className="relative h-36 border-b border-t border-neutral-200 dark:border-neutral-800">
              <div className="absolute inset-0 flex" onPointerLeave={() => setSelected(null)}>
                {data.map((d, i) => (
                  <button
                    key={d.key}
                    type="button"
                    aria-label={`${fullDate.format(d.date)}: ${describe(d)}`}
                    onPointerEnter={() => setSelected(i)}
                    onFocus={() => setSelected(i)}
                    onBlur={() => setSelected(null)}
                    onClick={() => setSelected(i)}
                    // A área de toque é a coluna inteira, não só a barra.
                    className="group flex h-full min-w-0 flex-1 items-end justify-center px-px outline-none"
                  >
                    <span
                      className={`w-full max-w-6 rounded-t bg-indigo-600 transition-opacity group-focus-visible:ring-2 group-focus-visible:ring-indigo-500 group-focus-visible:ring-offset-2 dark:bg-indigo-500 ${
                        selected !== null && selected !== i ? "opacity-50" : ""
                      }`}
                      style={{ height: `${(d.count / top) * 100}%`, minHeight: d.count ? 3 : 0 }}
                    />
                  </button>
                ))}
              </div>
            </div>
            <div className="mt-1.5 flex text-xs text-neutral-500" aria-hidden>
              {data.map((d, i) => (
                <span key={d.key} className="min-w-0 flex-1 text-center">
                  {(data.length - 1 - i) % labelEvery === 0 || todayFirst ? (i === todayIndex ? "hoje" : d.date.getUTCDate()) : ""}
                </span>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Os mesmos números em tabela, para leitores de ecrã. */}
      <table className="sr-only">
        <caption>
          {title} ({subtitle})
        </caption>
        <thead>
          <tr>
            <th scope="col">Dia</th>
            <th scope="col">{unit[1]}</th>
          </tr>
        </thead>
        <tbody>
          {data.map((d) => (
            <tr key={d.key}>
              <th scope="row">{fullDate.format(d.date)}</th>
              <td>{d.count}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </figure>
  );
}
