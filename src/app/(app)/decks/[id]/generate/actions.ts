"use server";

import { requireUser } from "@/lib/auth";
import { consumeAiQuota } from "@/lib/ai-usage";
import { type CardSides } from "@/lib/cards";
import {
  generateCardsFromImages,
  generateCardsFromPdf,
  generateCardsFromText,
  GenerationError,
  type ImageInput,
} from "@/lib/gemini";
import {
  GENERATE_COUNTS,
  IMAGE_TYPES,
  MAX_IMAGE_BYTES,
  MAX_IMAGES,
  MAX_TEXT_CHARS,
  MIN_TEXT_CHARS,
} from "@/lib/limits";
import { errorDetail, logError } from "@/lib/log";
import { MAX_PDF_BYTES, MAX_PDF_LABEL, PDF_BUCKET } from "@/lib/pdf";

export type GenerateResult = { error?: string; cards?: CardSides[] };

type Supabase = Awaited<ReturnType<typeof requireUser>>["supabase"];

/**
 * Gera cards a partir de um PDF que o browser já enviou para o Supabase
 * Storage (pdfs/<user_id>/...). O ficheiro é sempre apagado no fim.
 */
export async function generateFromPdf(deckId: string, path: string, count: number): Promise<GenerateResult> {
  const { supabase, userId } = await requireUser();
  const storage = supabase.storage.from(PDF_BUCKET);

  try {
    // O RLS do Storage já impede ler pastas alheias; isto dá um erro claro.
    if (typeof path !== "string" || !path.startsWith(`${userId}/`) || path.includes("..")) {
      return { error: "Ficheiro inválido." };
    }
    const invalid = await checkRequest(supabase, deckId, count);
    if (invalid) return invalid;

    const { data: blob, error } = await storage.download(path);
    if (error || !blob) return { error: "Não foi possível ler o PDF enviado. Tenta novamente." };
    if (blob.size > MAX_PDF_BYTES) return { error: `O PDF pode ter no máximo ${MAX_PDF_LABEL}.` };

    const bytes = new Uint8Array(await blob.arrayBuffer());
    // Verifica a assinatura "%PDF" em vez de confiar na extensão/tipo enviados.
    if (new TextDecoder().decode(bytes.subarray(0, 5)) !== "%PDF-") {
      return { error: "O ficheiro não é um PDF válido." };
    }

    return await generate(supabase, deckId, () => generateCardsFromPdf(bytes, count));
  } finally {
    const { error } = await storage.remove([path]);
    if (error) console.error("Falha ao apagar PDF do Storage", error);
  }
}

export async function generateFromText(deckId: string, text: string, count: number): Promise<GenerateResult> {
  const { supabase } = await requireUser();

  const material = typeof text === "string" ? text.trim() : "";
  if (material.length < MIN_TEXT_CHARS) return { error: `Cola pelo menos ${MIN_TEXT_CHARS} caracteres de texto.` };
  if (material.length > MAX_TEXT_CHARS) {
    return { error: `O texto pode ter no máximo ${MAX_TEXT_CHARS.toLocaleString("pt-PT")} caracteres.` };
  }
  const invalid = await checkRequest(supabase, deckId, count);
  if (invalid) return invalid;

  return generate(supabase, deckId, () => generateCardsFromText(material, count));
}

/** As fotos chegam já reduzidas pelo browser, no campo "images" do FormData. */
export async function generateFromImages(deckId: string, count: number, formData: FormData): Promise<GenerateResult> {
  const { supabase } = await requireUser();

  const files = formData.getAll("images").filter((f): f is File => f instanceof File && f.size > 0);
  if (files.length === 0) return { error: "Escolhe pelo menos uma foto." };
  if (files.length > MAX_IMAGES) return { error: `Podes enviar no máximo ${MAX_IMAGES} fotos de cada vez.` };
  if (files.some((f) => !IMAGE_TYPES.includes(f.type) || f.size > MAX_IMAGE_BYTES)) {
    return { error: "Uma das fotos não é válida. Usa imagens JPEG, PNG ou WebP." };
  }
  const invalid = await checkRequest(supabase, deckId, count);
  if (invalid) return invalid;

  const images: ImageInput[] = await Promise.all(
    files.map(async (f) => ({ bytes: new Uint8Array(await f.arrayBuffer()), mimeType: f.type })),
  );
  return generate(supabase, deckId, () => generateCardsFromImages(images, count));
}

async function checkRequest(supabase: Supabase, deckId: string, count: number): Promise<GenerateResult | null> {
  if (!GENERATE_COUNTS.includes(count)) return { error: "Quantidade inválida." };
  const { data: deck } = await supabase.from("decks").select("id").eq("id", deckId).maybeSingle();
  if (!deck) return { error: "Deck não encontrado." };
  return null;
}

async function generate(supabase: Supabase, deckId: string, run: () => Promise<CardSides[]>): Promise<GenerateResult> {
  const quota = await consumeAiQuota(supabase, "generate");
  if (quota.error) return { error: quota.error };

  try {
    return { cards: await run() };
  } catch (err) {
    const known = err instanceof GenerationError;
    await logError(supabase, {
      source: "server",
      message: known ? err.message : "Falha inesperada ao gerar cards",
      detail: known ? undefined : errorDetail(err),
      path: `/decks/${deckId}/generate`,
    });
    return { error: known ? err.message : "Algo correu mal ao gerar os cards." };
  }
}
