"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useMemo, useState, useTransition } from "react";
import { Button } from "@/components/ui/button";
import { formatInterval } from "@/lib/format";
import { GRADES, previewIntervals, type FsrsFields } from "@/lib/fsrs";
import { submitReview } from "./actions";

export type ReviewCard = FsrsFields & { id: string; front: string; back: string };

const gradeStyles = {
  1: "bg-red-600 hover:bg-red-500 active:bg-red-700",
  2: "bg-amber-500 hover:bg-amber-400 active:bg-amber-600",
  3: "bg-emerald-600 hover:bg-emerald-500 active:bg-emerald-700",
  4: "bg-sky-600 hover:bg-sky-500 active:bg-sky-700",
} as const;

export function ReviewSession({ deckId, deckName, cards }: { deckId: string; deckName: string; cards: ReviewCard[] }) {
  const router = useRouter();
  const [index, setIndex] = useState(0);
  const [revealed, setRevealed] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [nextDues, setNextDues] = useState<string[]>([]);
  // Hora da última resposta (tirada no handler, não durante o render).
  const [lastAnsweredAt, setLastAnsweredAt] = useState(0);
  const [pending, startTransition] = useTransition();

  const card = cards[index];
  const done = index >= cards.length;

  const intervals = useMemo(
    // Recalculado quando a resposta é revelada, para refletir a hora real.
    () => (card && revealed ? previewIntervals(card, new Date()) : null),
    [card, revealed],
  );

  const rate = useCallback(
    (rating: number) => {
      if (!card || !revealed || pending) return;
      setError(null);
      startTransition(async () => {
        const result = await submitReview(card.id, rating);
        if (!result.ok) {
          setError(result.error);
          return;
        }
        setNextDues((d) => [...d, result.due]);
        setLastAnsweredAt(Date.now());
        setRevealed(false);
        setIndex((i) => i + 1);
      });
    },
    [card, revealed, pending],
  );

  // Atalhos de teclado: espaço/enter revela, 1-4 avalia.
  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.target instanceof HTMLElement && e.target.closest("input, textarea")) return;
      if (!revealed && (e.key === " " || e.key === "Enter")) {
        e.preventDefault();
        setRevealed(true);
      } else if (revealed && ["1", "2", "3", "4"].includes(e.key)) {
        rate(Number(e.key));
      }
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [revealed, rate]);

  if (done) {
    return (
      <SessionDone
        deckId={deckId}
        count={cards.length}
        nextDues={nextDues}
        now={lastAnsweredAt}
        onRefresh={() => router.refresh()}
      />
    );
  }

  const progress = (index / cards.length) * 100;

  return (
    <div className="flex flex-1 flex-col gap-4">
      <div className="flex items-center justify-between gap-3 text-sm text-neutral-500">
        <Link href={`/decks/${deckId}`} className="truncate hover:text-neutral-800 dark:hover:text-neutral-200">
          ← {deckName}
        </Link>
        <span className="shrink-0 tabular-nums">
          {index + 1} / {cards.length}
        </span>
      </div>
      <div className="h-1.5 overflow-hidden rounded-full bg-neutral-200 dark:bg-neutral-800" aria-hidden>
        <div className="h-full rounded-full bg-indigo-600 transition-all" style={{ width: `${progress}%` }} />
      </div>

      <article
        className="flex min-h-72 flex-1 flex-col rounded-3xl border border-neutral-200 bg-white p-6 shadow-sm dark:border-neutral-800 dark:bg-neutral-900"
        aria-live="polite"
      >
        <p className="whitespace-pre-wrap break-words text-xl font-medium leading-relaxed">{card.front}</p>
        {revealed && (
          <>
            <hr className="my-6 border-neutral-200 dark:border-neutral-800" />
            <p className="whitespace-pre-wrap break-words text-lg leading-relaxed text-neutral-700 dark:text-neutral-300">
              {card.back}
            </p>
          </>
        )}
      </article>

      {error && (
        <p role="alert" className="text-center text-sm text-red-600 dark:text-red-400">
          {error}
        </p>
      )}

      {/* Botões fixos em baixo, ao alcance do polegar. */}
      <div className="sticky bottom-0 -mx-4 bg-background/95 px-4 pb-[max(1rem,env(safe-area-inset-bottom))] pt-2 backdrop-blur">
        {!revealed ? (
          <Button className="min-h-14 w-full text-base" onClick={() => setRevealed(true)}>
            Mostrar resposta
          </Button>
        ) : (
          <div className="grid grid-cols-4 gap-2">
            {GRADES.map(({ rating, label }) => (
              <button
                key={rating}
                type="button"
                disabled={pending}
                onClick={() => rate(rating)}
                className={`flex min-h-16 flex-col items-center justify-center rounded-2xl text-white transition-colors disabled:opacity-60 ${gradeStyles[rating]}`}
              >
                <span className="text-sm font-semibold">{label}</span>
                {intervals && <span className="text-xs opacity-90">{formatInterval(intervals[rating])}</span>}
              </button>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

function SessionDone({
  deckId,
  count,
  nextDues,
  now,
  onRefresh,
}: {
  deckId: string;
  count: number;
  nextDues: string[];
  now: number;
  onRefresh: () => void;
}) {
  // Cards em aprendizagem voltam dentro de minutos.
  const soon = nextDues.filter((d) => new Date(d).getTime() - now < 60 * 60_000);
  const nextSoon = soon.length ? Math.min(...soon.map((d) => new Date(d).getTime())) : null;

  return (
    <div className="flex flex-1 flex-col items-center justify-center gap-4 text-center">
      <div className="text-5xl" aria-hidden>
        🎉
      </div>
      <h1 className="text-2xl font-semibold tracking-tight">Sessão concluída</h1>
      <p className="text-neutral-500">
        Reviste {count} {count === 1 ? "card" : "cards"}.
      </p>
      {nextSoon && (
        <p className="max-w-xs text-sm text-neutral-500">
          {soon.length} {soon.length === 1 ? "card volta" : "cards voltam"} daqui a{" "}
          {formatInterval(Math.max(0, nextSoon - now))}.
        </p>
      )}
      <div className="mt-2 flex w-full max-w-xs flex-col gap-2">
        {nextSoon && (
          <Button variant="secondary" onClick={onRefresh}>
            Verificar de novo
          </Button>
        )}
        <Link
          href={`/decks/${deckId}`}
          className="inline-flex min-h-11 items-center justify-center rounded-xl bg-indigo-600 px-4 text-sm font-medium text-white hover:bg-indigo-500"
        >
          Voltar ao deck
        </Link>
      </div>
    </div>
  );
}
