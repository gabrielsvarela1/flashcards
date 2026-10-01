"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { parseCardsText } from "@/lib/csv";
import { MAX_CARDS_PER_SAVE } from "@/lib/limits";
import { DraftList, toDrafts, type Draft } from "../draft-list";

const MAX_FILE_BYTES = 5 * 1024 * 1024;

export function ImportFlow({ deckId }: { deckId: string }) {
  const [text, setText] = useState("");
  const [drafts, setDrafts] = useState<Draft[] | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  function preview(source: string) {
    setError(null);
    const { cards, skipped, overLimit } = parseCardsText(source);
    if (!cards.length) {
      setError("Não encontrei cards. Cada linha precisa de frente e verso, separados por vírgula, ponto e vírgula ou tabulação.");
      return;
    }
    const notes = [];
    if (skipped) notes.push(`${skipped} ${skipped === 1 ? "linha ignorada" : "linhas ignoradas"} por não ${skipped === 1 ? "ter" : "terem"} frente e verso válidos`);
    if (overLimit) notes.push(`${overLimit} ${overLimit === 1 ? "card ficou" : "cards ficaram"} de fora (máximo de ${MAX_CARDS_PER_SAVE} por importação)`);
    setNotice(notes.length ? `${notes.join("; ")}.` : null);
    setDrafts(toDrafts(cards));
  }

  async function onFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file) return;
    if (file.size > MAX_FILE_BYTES) {
      setError("O ficheiro pode ter no máximo 5 MB.");
      return;
    }
    try {
      preview(await file.text());
    } catch {
      setError("Não foi possível ler o ficheiro.");
    }
  }

  if (drafts) {
    return (
      <div className="flex flex-col gap-4">
        {notice && (
          <p role="status" className="rounded-xl bg-amber-50 p-3 text-sm text-amber-900 dark:bg-amber-950 dark:text-amber-100">
            {notice}
          </p>
        )}
        <DraftList
          deckId={deckId}
          drafts={drafts}
          setDrafts={setDrafts}
          restartLabel="Importar outra coisa"
          onRestart={() => setDrafts(null)}
        />
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-4">
      <label className="flex cursor-pointer flex-col items-center justify-center gap-2 rounded-2xl border-2 border-dashed border-neutral-300 bg-white p-6 text-center transition-colors hover:border-indigo-400 has-[:focus-visible]:border-indigo-500 dark:border-neutral-700 dark:bg-neutral-900">
        <span className="font-medium">Escolher ficheiro</span>
        <span className="text-sm text-neutral-500">.csv, .tsv ou .txt</span>
        <input
          type="file"
          accept=".csv,.tsv,.txt,text/csv,text/plain,text/tab-separated-values"
          onChange={onFile}
          className="mt-2 w-full max-w-xs text-sm file:mr-3 file:rounded-lg file:border-0 file:bg-indigo-50 file:px-3 file:py-2 file:text-indigo-700 dark:file:bg-indigo-950 dark:file:text-indigo-300"
        />
      </label>

      <div className="flex items-center gap-3 text-xs text-neutral-500" aria-hidden>
        <span className="h-px flex-1 bg-neutral-200 dark:bg-neutral-800" />
        ou
        <span className="h-px flex-1 bg-neutral-200 dark:bg-neutral-800" />
      </div>

      <label htmlFor="import-text" className="flex flex-col gap-1.5">
        <span className="text-sm font-medium text-neutral-700 dark:text-neutral-300">Colar texto</span>
        <textarea
          id="import-text"
          value={text}
          onChange={(e) => setText(e.target.value)}
          rows={6}
          placeholder={"Capital de Portugal;Lisboa\nCapital de França;Paris"}
          className="min-h-32 resize-y rounded-xl border border-neutral-300 bg-white px-3 py-2.5 font-mono text-sm outline-none placeholder:text-neutral-400 focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/30 dark:border-neutral-700 dark:bg-neutral-900"
        />
      </label>

      {error && (
        <p role="alert" className="text-sm text-red-600 dark:text-red-400">
          {error}
        </p>
      )}

      <Button onClick={() => preview(text)} disabled={!text.trim()} className="min-h-14 text-base">
        Pré-visualizar
      </Button>
      <p className="text-xs text-neutral-500">
        No Anki: Ficheiro → Exportar → “Notas em texto simples (.txt)”. Numa folha de cálculo: guarda como CSV, com a
        frente na primeira coluna e o verso na segunda.
      </p>
    </div>
  );
}
