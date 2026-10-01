import type { Metadata } from "next";
import { requireUser } from "@/lib/auth";
import type { ReviewPoint } from "@/lib/stats";
import { StatsView } from "./stats-view";

export const metadata: Metadata = { title: "Estatísticas · Flashcards" };

const DAY_MS = 24 * 60 * 60 * 1000;
// Janela do histórico (a sequência de dias é contada dentro dela).
const HISTORY_DAYS = 120;
const FORECAST_DAYS = 7;
// O Supabase devolve no máximo 1000 linhas por pedido.
const PAGE = 1000;
const MAX_PAGES = 10;

type Supabase = Awaited<ReturnType<typeof requireUser>>["supabase"];

async function fetchReviews(supabase: Supabase) {
  const since = new Date(Date.now() - HISTORY_DAYS * DAY_MS).toISOString();
  const points: ReviewPoint[] = [];
  for (let page = 0; page < MAX_PAGES; page++) {
    const { data } = await supabase
      .from("reviews")
      .select("reviewed_at, rating")
      .gte("reviewed_at", since)
      .order("reviewed_at", { ascending: false })
      .range(page * PAGE, (page + 1) * PAGE - 1)
      .overrideTypes<{ reviewed_at: string; rating: number }[], { merge: false }>();
    if (!data) break;
    for (const r of data) points.push([Math.floor(new Date(r.reviewed_at).getTime() / 1000), r.rating]);
    if (data.length < PAGE) break;
  }
  return points;
}

async function fetchDues(supabase: Supabase) {
  // Um dia a mais de margem: o último dia da previsão depende do fuso de quem vê.
  const until = new Date(Date.now() + (FORECAST_DAYS + 1) * DAY_MS).toISOString();
  const dues: number[] = [];
  for (let page = 0; page < MAX_PAGES; page++) {
    const { data } = await supabase
      .from("cards")
      .select("due")
      .lte("due", until)
      .order("due", { ascending: true })
      .range(page * PAGE, (page + 1) * PAGE - 1)
      .overrideTypes<{ due: string }[], { merge: false }>();
    if (!data) break;
    for (const c of data) dues.push(new Date(c.due).getTime());
    if (data.length < PAGE) break;
  }
  return dues;
}

const countCards = (supabase: Supabase, states?: number[]) => {
  const query = supabase.from("cards").select("id", { count: "exact", head: true });
  return (states ? query.in("state", states) : query).then(({ count }) => count ?? 0);
};

export default async function StatsPage() {
  const { supabase } = await requireUser();

  const [reviews, dues, total, fresh, learning, mature] = await Promise.all([
    fetchReviews(supabase),
    fetchDues(supabase),
    countCards(supabase),
    countCards(supabase, [0]),
    countCards(supabase, [1, 3]),
    countCards(supabase, [2]),
  ]);

  return (
    <div className="flex flex-col gap-6">
      <h1 className="text-2xl font-semibold tracking-tight">Estatísticas</h1>
      <StatsView
        reviews={reviews}
        dues={dues}
        cards={{ total, fresh, learning, mature }}
        historyDays={HISTORY_DAYS}
        forecastDays={FORECAST_DAYS}
      />
    </div>
  );
}
