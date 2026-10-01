"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useMemo, useState, useTransition } from "react";
import { Button } from "@/components/ui/button";
import { formatInterval } from "@/lib/format";
import { GRADES, previewIntervals, type FsrsFields } from "@/lib/fsrs";
import type { Verdict } from "@/lib/gemini";
import { MAX_ANSWER_CHARS } from "@/lib/limits";
import { useLocalFlag } from "@/lib/use-local-flag";
import { checkAnswer, submitReview } from "./actions";

export type ReviewCard = FsrsFields & { id: string; front: string; back: string; deckName?: string };

type Feedback = { verdict: Verdict; text: string } | { verdict: null; text: string };

const gradeStyles = {
  1: "bg-red-600 hover:bg-red-500 active:bg-red-700",
  2: "bg-amber-600 hover:bg-amber-500 active:bg-amber-700",
  3: "bg-emerald-600 hover:bg-emerald-500 active:bg-emerald-700",
  4: "bg-sky-600 hover:bg-sky-500 active:bg-sky-700",
} as const;

// O que a IA concluiu → avaliação sugerida. A decisão final é do utilizador.
const verdicts = {
  correct: {
    label: "Certo",
    rating: 3,
    style: "border-emerald-300 bg-emerald-50 text-emerald-900 dark:border-emerald-800 dark:bg-emerald-950 dark:text-emerald-100",
  },
  partial: {
    label: "Quase",
    rating: 2,
    style: "border-amber-300 bg-amber-50 text-amber-900 dark:border-amber-800 dark:bg-amber-950 dark:text-amber-100",
  },
  wrong: {
    label: "Errado",
    rating: 1,
    style: "border-red-300 bg-red-50 text-red-900 dark:border-red-800 dark:bg-red-950 dark:text-red-100",
  },
} as const;

export function ReviewSession({
  backHref,
  backLabel,
  cards,
}: {
  backHref: string;
  backLabel: string;
  cards: ReviewCard[];
}) {
  const router = useRouter();
  const [index, setIndex] = useState(0);
  const [revealed, setRevealed] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [nextDues, setNextDues] = useState<string[]>([]);
  // Hora da última resposta (tirada no handler, não durante o render).
  const [lastAnsweredAt, setLastAnsweredAt] = useState(0);
  const [pending, startTransition] = useTransition();

  // Modo de resposta escrita, corrigida pela IA. A preferência fica no dispositivo.
  const [written, setWritten] = useLocalFlag("review-written");
  const [answer, setAnswer] = useState("");
  const [feedback, setFeedback] = useState<Feedback | null>(null);
  const [checking, startChecking] = useTransition();

  const card = cards[index];
  const done = index >= cards.length;
  const suggested = feedback?.verdict ? verdicts[feedback.verdict].rating : null;

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
        setAnswer("");
        setFeedback(null);
        setIndex((i) => i + 1);
      });
    },
    [card, revealed, pending],
  );

  function check() {
    if (!card || revealed || checking) return;
    setError(null);
    startChecking(async () => {
      const result = await checkAnswer(card.id, answer);
      // Mesmo que a correção falhe, mostra a resposta: o utilizador avalia-se a si próprio.
      setFeedback(result.ok ? { verdict: result.verdict, text: result.feedback } : { verdict: null, text: result.error });
      setRevealed(true);
    });
  }

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
        backHref={backHref}
        count={cards.length}
        nextDues={nextDues}
        now={lastAnsweredAt}
        onRefresh={() => router.refresh()}
      />
    );
  }

  const progress = (index / cards.length) * 100;
  const writing = written && !revealed;

  return (
    <div className="flex flex-1 flex-col gap-4">
      <div className="flex items-center justify-between gap-3 text-sm text-neutral-500">
        <Link href={backHref} className="truncate hover:text-neutral-800 dark:hover:text-neutral-200">
          ← {backLabel}
        </Link>
        <span className="shrink-0 tabular-nums">
          {index + 1} / {cards.length}
        </span>
      </div>
      <div className="h-1.5 overflow-hidden rounded-full bg-neutral-200 dark:bg-neutral-800" aria-hidden>
        <div className="h-full rounded-full bg-indigo-600 transition-all" style={{ width: `${progress}%` }} />
      </div>

      <article
        className={`flex min-h-64 flex-1 flex-col rounded-3xl border border-neutral-200 bg-white p-6 shadow-sm dark:border-neutral-800 dark:bg-neutral-900 ${revealed || writing ? "" : "cursor-pointer"}`}
        aria-live="polite"
        // Tocar no card também revela a resposta (exceto quando se está a escrever).
        onClick={writing ? undefined : () => setRevealed(true)}
      >
        {card.deckName && <p className="mb-3 truncate text-xs font-medium text-indigo-600 dark:text-indigo-400">{card.deckName}</p>}
        <p className="whitespace-pre-wrap break-words text-xl font-medium leading-relaxed">{card.front}</p>
        {revealed && (
          <>
            <hr className="my-6 border-neutral-200 dark:border-neutral-800" />
            <p className="whitespace-pre-wrap break-words text-lg leading-relaxed text-neutral-700 dark:text-neutral-300">
              {card.back}
            </p>
            {answer.trim() && (
              <p className="mt-6 whitespace-pre-wrap break-words text-sm text-neutral-500">
                <span className="font-medium">A tua resposta:</span> {answer.trim()}
              </p>
            )}
            {feedback && (
              <div
                role="status"
                className={`mt-3 rounded-xl border p-3 text-sm ${
                  feedback.verdict
                    ? verdicts[feedback.verdict].style
                    : "border-neutral-200 bg-neutral-50 text-neutral-600 dark:border-neutral-800 dark:bg-neutral-950 dark:text-neutral-300"
                }`}
              >
                {feedback.verdict && <span className="font-semibold">{verdicts[feedback.verdict].label}. </span>}
                {feedback.text}
              </div>
            )}
          </>
        )}
        {!revealed && !written && (
          <p className="mt-auto pt-6 text-center text-sm text-neutral-400">Toca para ver a resposta</p>
        )}
        {writing && (
          <textarea
            value={answer}
            onChange={(e) => setAnswer(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter" && (e.ctrlKey || e.metaKey)) check();
            }}
            maxLength={MAX_ANSWER_CHARS}
            rows={4}
            disabled={checking}
            aria-label="A tua resposta"
            placeholder="Escreve a tua resposta…"
            className="mt-6 min-h-28 resize-y rounded-xl border border-neutral-300 bg-white px-3 py-2.5 text-base outline-none placeholder:text-neutral-400 focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/30 dark:border-neutral-700 dark:bg-neutral-950"
          />
        )}
      </article>

      {error && (
        <p role="alert" className="text-center text-sm text-red-600 dark:text-red-400">
          {error}
        </p>
      )}

      {/* Botões fixos em baixo, ao alcance do polegar. */}
      <div className="sticky bottom-0 -mx-4 flex flex-col gap-2 bg-background/95 px-4 pb-[max(1rem,env(safe-area-inset-bottom))] pt-2 backdrop-blur">
        {revealed ? (
          <div className="grid grid-cols-4 gap-2">
            {GRADES.map(({ rating, label }) => (
              <button
                key={rating}
                type="button"
                disabled={pending}
                onClick={() => rate(rating)}
                aria-label={suggested === rating ? `${label} (sugerido pela IA)` : undefined}
                className={`flex min-h-16 flex-col items-center justify-center rounded-2xl text-white transition-colors disabled:opacity-60 ${gradeStyles[rating]} ${
                  suggested === rating ? "ring-2 ring-neutral-900 ring-offset-2 ring-offset-background dark:ring-white" : ""
                }`}
              >
                <span className="text-sm font-semibold">{label}</span>
                {intervals && <span className="text-xs opacity-90">{formatInterval(intervals[rating])}</span>}
              </button>
            ))}
          </div>
        ) : written ? (
          <div className="flex gap-2">
            <Button className="min-h-14 flex-1 text-base" onClick={check} disabled={checking || !answer.trim()}>
              {checking ? "A corrigir…" : "Verificar com IA"}
            </Button>
            <Button variant="secondary" className="min-h-14" onClick={() => setRevealed(true)} disabled={checking}>
              Ver resposta
            </Button>
          </div>
        ) : (
          <Button className="min-h-14 w-full text-base" onClick={() => setRevealed(true)}>
            Mostrar resposta
          </Button>
        )}
        {!revealed && (
          <label className="flex min-h-9 cursor-pointer items-center justify-center gap-2 text-sm text-neutral-500">
            <input
              type="checkbox"
              checked={written}
              onChange={(e) => setWritten(e.target.checked)}
              disabled={checking}
              className="size-4 accent-indigo-600"
            />
            Escrever a resposta e corrigir com IA
          </label>
        )}
      </div>
    </div>
  );
}

function SessionDone({
  backHref,
  count,
  nextDues,
  now,
  onRefresh,
}: {
  backHref: string;
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
          href={backHref}
          className="inline-flex min-h-11 items-center justify-center rounded-xl bg-indigo-600 px-4 text-sm font-medium text-white hover:bg-indigo-500"
        >
          Voltar
        </Link>
      </div>
    </div>
  );
}
