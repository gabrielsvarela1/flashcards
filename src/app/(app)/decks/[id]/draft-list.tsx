"use client";

import { useState, useTransition } from "react";
import { Button } from "@/components/ui/button";
import { CARD_SIDE_MAX, type CardSides } from "@/lib/cards";
import { saveCards } from "./card-actions";

export type Draft = CardSides & { keep: boolean };

export const toDrafts = (cards: CardSides[]): Draft[] => cards.map((c) => ({ ...c, keep: true }));

/** Lista de cards por guardar (gerados ou importados): rever, editar e escolher. */
export function DraftList({
  deckId,
  drafts,
  setDrafts,
  restartLabel,
  onRestart,
}: {
  deckId: string;
  drafts: Draft[];
  setDrafts: (d: Draft[]) => void;
  restartLabel: string;
  onRestart: () => void;
}) {
  const [error, setError] = useState<string | null>(null);
  const [saving, startSaving] = useTransition();
  const selected = drafts.filter((d) => d.keep);

  function update(i: number, patch: Partial<Draft>) {
    setDrafts(drafts.map((d, j) => (j === i ? { ...d, ...patch } : d)));
  }

  function save() {
    setError(null);
    startSaving(async () => {
      const result = await saveCards(
        deckId,
        selected.map(({ front, back }) => ({ front, back })),
      );
      if (result?.error) setError(result.error);
    });
  }

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center justify-between gap-3">
        <p className="text-sm text-neutral-500">
          {drafts.length} {drafts.length === 1 ? "card" : "cards"} · {selected.length}{" "}
          {selected.length === 1 ? "selecionado" : "selecionados"}
        </p>
        <button
          type="button"
          onClick={() => setDrafts(drafts.map((d) => ({ ...d, keep: selected.length !== drafts.length })))}
          className="min-h-9 rounded-lg px-2 text-sm text-indigo-600 hover:bg-indigo-50 dark:text-indigo-400 dark:hover:bg-indigo-950"
        >
          {selected.length === drafts.length ? "Desmarcar todos" : "Marcar todos"}
        </button>
      </div>

      <ul className="flex flex-col gap-3">
        {drafts.map((d, i) => (
          <li
            key={i}
            className={`flex gap-3 rounded-2xl border bg-white p-3 transition-opacity dark:bg-neutral-900 ${
              d.keep ? "border-neutral-200 dark:border-neutral-800" : "border-dashed border-neutral-300 opacity-50 dark:border-neutral-700"
            }`}
          >
            <input
              type="checkbox"
              checked={d.keep}
              onChange={(e) => update(i, { keep: e.target.checked })}
              aria-label={`Incluir card ${i + 1}`}
              className="mt-2 size-5 shrink-0 accent-indigo-600"
            />
            <div className="flex min-w-0 flex-1 flex-col gap-2">
              <textarea
                value={d.front}
                onChange={(e) => update(i, { front: e.target.value })}
                maxLength={CARD_SIDE_MAX}
                rows={2}
                aria-label={`Frente do card ${i + 1}`}
                className="field-sizing-content resize-none rounded-lg border border-transparent bg-transparent p-1.5 text-base font-medium outline-none focus:border-indigo-400"
              />
              <textarea
                value={d.back}
                onChange={(e) => update(i, { back: e.target.value })}
                maxLength={CARD_SIDE_MAX}
                rows={2}
                aria-label={`Verso do card ${i + 1}`}
                className="field-sizing-content resize-none rounded-lg border border-transparent bg-transparent p-1.5 text-sm text-neutral-600 outline-none focus:border-indigo-400 dark:text-neutral-400"
              />
            </div>
          </li>
        ))}
      </ul>

      {error && (
        <p role="alert" className="text-sm text-red-600 dark:text-red-400">
          {error}
        </p>
      )}

      <div className="sticky bottom-0 -mx-4 flex flex-col gap-2 bg-background/95 px-4 pb-[max(1rem,env(safe-area-inset-bottom))] pt-2 backdrop-blur">
        <Button onClick={save} disabled={saving || selected.length === 0} className="min-h-14 text-base">
          {saving ? "A guardar…" : `Guardar ${selected.length} ${selected.length === 1 ? "card" : "cards"}`}
        </Button>
        <Button variant="ghost" onClick={onRestart} disabled={saving}>
          {restartLabel}
        </Button>
      </div>
    </div>
  );
}
