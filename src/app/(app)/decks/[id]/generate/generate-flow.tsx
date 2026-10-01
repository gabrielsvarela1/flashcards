"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { shrinkImage } from "@/lib/image";
import { MAX_IMAGES, MAX_TEXT_CHARS, MIN_TEXT_CHARS } from "@/lib/limits";
import { MAX_PDF_BYTES, MAX_PDF_LABEL, PDF_BUCKET } from "@/lib/pdf";
import { createClient } from "@/lib/supabase/client";
import { DraftList, toDrafts, type Draft } from "../draft-list";
import { generateFromImages, generateFromPdf, generateFromText, type GenerateResult } from "./actions";

type Source = "pdf" | "text" | "images";
type Step = "idle" | "uploading" | "generating";

const SOURCES: { id: Source; label: string }[] = [
  { id: "pdf", label: "PDF" },
  { id: "text", label: "Texto" },
  { id: "images", label: "Fotos" },
];

const dropzone =
  "flex cursor-pointer flex-col items-center justify-center gap-2 rounded-2xl border-2 border-dashed border-neutral-300 bg-white p-8 text-center transition-colors hover:border-indigo-400 has-[:focus-visible]:border-indigo-500 dark:border-neutral-700 dark:bg-neutral-900";
const fileInput =
  "mt-2 w-full max-w-xs text-sm file:mr-3 file:rounded-lg file:border-0 file:bg-indigo-50 file:px-3 file:py-2 file:text-indigo-700 dark:file:bg-indigo-950 dark:file:text-indigo-300";

export function GenerateFlow({ deckId, userId }: { deckId: string; userId: string }) {
  const [source, setSource] = useState<Source>("pdf");
  const [drafts, setDrafts] = useState<Draft[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [step, setStep] = useState<Step>("idle");
  const [textLength, setTextLength] = useState(0);
  const busy = step !== "idle";

  async function fromPdf(form: FormData, count: number): Promise<GenerateResult> {
    const file = form.get("pdf");
    if (!(file instanceof File) || file.size === 0) return { error: "Escolhe um ficheiro PDF." };
    if (file.type && file.type !== "application/pdf") return { error: "O ficheiro tem de ser um PDF." };
    if (file.size > MAX_PDF_BYTES) return { error: `O PDF pode ter no máximo ${MAX_PDF_LABEL}.` };

    // Envio direto do browser para o Supabase Storage: não passa pela
    // Vercel, que limita os pedidos a 4,5 MB.
    setStep("uploading");
    const path = `${userId}/${crypto.randomUUID()}.pdf`;
    const { error: uploadError } = await createClient()
      .storage.from(PDF_BUCKET)
      .upload(path, file, { contentType: "application/pdf" });
    if (uploadError) return { error: "Não foi possível enviar o PDF. Verifica a ligação e tenta novamente." };

    setStep("generating");
    return generateFromPdf(deckId, path, count);
  }

  async function fromText(form: FormData, count: number): Promise<GenerateResult> {
    const text = String(form.get("text") ?? "").trim();
    if (text.length < MIN_TEXT_CHARS) return { error: `Cola pelo menos ${MIN_TEXT_CHARS} caracteres de texto.` };

    setStep("generating");
    return generateFromText(deckId, text, count);
  }

  async function fromImages(form: FormData, count: number): Promise<GenerateResult> {
    const files = form.getAll("images").filter((f): f is File => f instanceof File && f.size > 0);
    if (files.length === 0) return { error: "Escolhe pelo menos uma foto." };
    if (files.length > MAX_IMAGES) return { error: `Podes enviar no máximo ${MAX_IMAGES} fotos de cada vez.` };

    setStep("uploading");
    const payload = new FormData();
    try {
      for (const file of files) payload.append("images", await shrinkImage(file));
    } catch {
      return { error: "Não foi possível ler uma das fotos. Usa imagens JPEG ou PNG." };
    }

    setStep("generating");
    return generateFromImages(deckId, count, payload);
  }

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);
    const form = new FormData(e.currentTarget);
    const count = Number(form.get("count"));

    try {
      const run = source === "pdf" ? fromPdf : source === "text" ? fromText : fromImages;
      const result = await run(form, count);
      if (result.error) setError(result.error);
      if (result.cards) setDrafts(toDrafts(result.cards));
    } catch {
      setError("Algo correu mal. Tenta novamente.");
    } finally {
      setStep("idle");
    }
  }

  if (drafts) {
    return (
      <DraftList
        deckId={deckId}
        drafts={drafts}
        setDrafts={setDrafts}
        restartLabel="Gerar outra vez"
        onRestart={() => setDrafts(null)}
      />
    );
  }

  return (
    <form onSubmit={onSubmit} className="flex flex-col gap-4">
      <div role="tablist" aria-label="Origem do conteúdo" className="grid grid-cols-3 rounded-xl bg-neutral-100 p-1 dark:bg-neutral-800">
        {SOURCES.map((s) => (
          <button
            key={s.id}
            role="tab"
            type="button"
            aria-selected={source === s.id}
            disabled={busy}
            onClick={() => {
              setSource(s.id);
              setError(null);
            }}
            className={`min-h-10 rounded-lg text-sm font-medium transition-colors ${
              source === s.id
                ? "bg-white text-neutral-900 shadow-sm dark:bg-neutral-950 dark:text-neutral-100"
                : "text-neutral-500"
            }`}
          >
            {s.label}
          </button>
        ))}
      </div>

      {source === "pdf" && (
        <label className={dropzone}>
          <span className="text-3xl" aria-hidden>
            📄
          </span>
          <span className="font-medium">Escolher PDF</span>
          <span className="text-sm text-neutral-500">Até {MAX_PDF_LABEL}</span>
          <input type="file" name="pdf" accept="application/pdf,.pdf" required disabled={busy} className={fileInput} />
        </label>
      )}

      {source === "text" && (
        <label htmlFor="generate-text" className="flex flex-col gap-1.5">
          <span className="text-sm font-medium text-neutral-700 dark:text-neutral-300">Texto para estudar</span>
          <textarea
            id="generate-text"
            name="text"
            required
            rows={8}
            minLength={MIN_TEXT_CHARS}
            maxLength={MAX_TEXT_CHARS}
            disabled={busy}
            placeholder="Cola aqui os teus apontamentos, um resumo ou um capítulo."
            onChange={(e) => setTextLength(e.target.value.trim().length)}
            className="min-h-40 resize-y rounded-xl border border-neutral-300 bg-white px-3 py-2.5 text-base outline-none placeholder:text-neutral-400 focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/30 dark:border-neutral-700 dark:bg-neutral-900"
          />
          <span className="text-xs text-neutral-500">
            {textLength.toLocaleString("pt-PT")} / {MAX_TEXT_CHARS.toLocaleString("pt-PT")} caracteres
          </span>
        </label>
      )}

      {source === "images" && (
        <label className={dropzone}>
          <span className="text-3xl" aria-hidden>
            📷
          </span>
          <span className="font-medium">Escolher fotos</span>
          <span className="text-sm text-neutral-500">Até {MAX_IMAGES} fotos de apontamentos ou páginas</span>
          <input type="file" name="images" accept="image/*" multiple required disabled={busy} className={fileInput} />
        </label>
      )}

      <label className="flex items-center justify-between gap-4">
        <span className="text-sm font-medium text-neutral-700 dark:text-neutral-300">Quantos cards?</span>
        <select
          name="count"
          defaultValue="20"
          disabled={busy}
          className="min-h-11 rounded-xl border border-neutral-300 bg-white px-3 text-base dark:border-neutral-700 dark:bg-neutral-900"
        >
          <option value="10">Até 10</option>
          <option value="20">Até 20</option>
          <option value="30">Até 30</option>
        </select>
      </label>

      {error && (
        <p role="alert" className="text-sm text-red-600 dark:text-red-400">
          {error}
        </p>
      )}

      <Button type="submit" disabled={busy} className="min-h-14 text-base">
        {step === "uploading" ? "A preparar o envio…" : step === "generating" ? "A gerar cards…" : "Gerar cards"}
      </Button>
      {busy && (
        <p className="text-center text-sm text-neutral-500" role="status">
          Pode demorar até um minuto.
        </p>
      )}
      <p className="text-xs text-neutral-500">
        O conteúdo é enviado ao Google Gemini para gerar os cards e não fica guardado na app. No plano gratuito,
        o Google pode usar o conteúdo para melhorar os modelos: evita documentos privados.
      </p>
    </form>
  );
}
