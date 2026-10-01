"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { requireUser } from "@/lib/auth";
import { parseSides, type CardSides } from "@/lib/cards";
import { generateCardsFromPdf, GenerationError } from "@/lib/gemini";

const MAX_PDF_BYTES = 4 * 1024 * 1024;
const COUNTS = [10, 20, 30];
const MAX_SAVE = 100;

export type GenerateState = { error?: string; cards?: CardSides[] };

export async function generateCards(_prev: GenerateState, formData: FormData): Promise<GenerateState> {
  const deckId = String(formData.get("deck_id") ?? "");
  const file = formData.get("pdf");
  const count = Number(formData.get("count"));

  if (!(file instanceof File) || file.size === 0) return { error: "Escolhe um ficheiro PDF." };
  if (file.size > MAX_PDF_BYTES) return { error: "O PDF pode ter no máximo 4 MB." };
  if (!COUNTS.includes(count)) return { error: "Quantidade inválida." };

  const bytes = new Uint8Array(await file.arrayBuffer());
  // Verifica a assinatura "%PDF" em vez de confiar na extensão/tipo enviados.
  if (new TextDecoder().decode(bytes.subarray(0, 5)) !== "%PDF-") {
    return { error: "O ficheiro não é um PDF válido." };
  }

  const { supabase } = await requireUser();
  const { data: deck } = await supabase.from("decks").select("id").eq("id", deckId).maybeSingle();
  if (!deck) return { error: "Deck não encontrado." };

  try {
    return { cards: await generateCardsFromPdf(bytes, count) };
  } catch (err) {
    if (err instanceof GenerationError) return { error: err.message };
    console.error(err);
    return { error: "Algo correu mal ao gerar os cards." };
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
