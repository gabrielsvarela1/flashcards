"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { requireUser } from "@/lib/auth";
import { parseSides, type CardSides } from "@/lib/cards";
import { generateCardsFromPdf, GenerationError } from "@/lib/gemini";
import { MAX_PDF_BYTES, MAX_PDF_LABEL, PDF_BUCKET } from "@/lib/pdf";

const COUNTS = [10, 20, 30];
const MAX_SAVE = 100;

export type GenerateResult = { error?: string; cards?: CardSides[] };

/**
 * Gera cards a partir de um PDF que o browser já enviou para o Supabase
 * Storage (pdfs/<user_id>/...). O ficheiro é sempre apagado no fim.
 */
export async function generateCards(deckId: string, path: string, count: number): Promise<GenerateResult> {
  const { supabase, userId } = await requireUser();
  const storage = supabase.storage.from(PDF_BUCKET);

  try {
    // O RLS do Storage já impede ler pastas alheias; isto dá um erro claro.
    if (typeof path !== "string" || !path.startsWith(`${userId}/`) || path.includes("..")) {
      return { error: "Ficheiro inválido." };
    }
    if (!COUNTS.includes(count)) return { error: "Quantidade inválida." };

    const { data: deck } = await supabase.from("decks").select("id").eq("id", deckId).maybeSingle();
    if (!deck) return { error: "Deck não encontrado." };

    const { data: blob, error } = await storage.download(path);
    if (error || !blob) return { error: "Não foi possível ler o PDF enviado. Tenta novamente." };
    if (blob.size > MAX_PDF_BYTES) return { error: `O PDF pode ter no máximo ${MAX_PDF_LABEL}.` };

    const bytes = new Uint8Array(await blob.arrayBuffer());
    // Verifica a assinatura "%PDF" em vez de confiar na extensão/tipo enviados.
    if (new TextDecoder().decode(bytes.subarray(0, 5)) !== "%PDF-") {
      return { error: "O ficheiro não é um PDF válido." };
    }

    return { cards: await generateCardsFromPdf(bytes, count) };
  } catch (err) {
    if (err instanceof GenerationError) return { error: err.message };
    console.error(err);
    return { error: "Algo correu mal ao gerar os cards." };
  } finally {
    const { error } = await storage.remove([path]);
    if (error) console.error("Falha ao apagar PDF do Storage", error);
  }
}

export async function saveGeneratedCards(deckId: string, cards: CardSides[]): Promise<{ error?: string }> {
  if (!Array.isArray(cards) || cards.length === 0) return { error: "Escolhe pelo menos um card." };
  if (cards.length > MAX_SAVE) return { error: `Podes guardar no máximo ${MAX_SAVE} cards de cada vez.` };

  const rows: (CardSides & { deck_id: string })[] = [];
  for (const [i, c] of cards.entries()) {
    const sides = parseSides(c?.front, c?.back);
    if ("error" in sides) return { error: `Card ${i + 1}: ${sides.error}` };
    rows.push({ deck_id: deckId, ...sides });
  }

  const { supabase } = await requireUser();
  // O RLS rejeita a inserção se o deck não for do utilizador.
  const { error } = await supabase.from("cards").insert(rows);
  if (error) return { error: "Não foi possível guardar os cards." };

  revalidatePath(`/decks/${deckId}`);
  redirect(`/decks/${deckId}`);
}
