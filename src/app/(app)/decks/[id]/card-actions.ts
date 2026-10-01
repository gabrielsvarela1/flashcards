"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { requireUser } from "@/lib/auth";
import { parseSides, type CardSides } from "@/lib/cards";
import { MAX_CARDS_PER_SAVE } from "@/lib/limits";

export type CardFormState = { error?: string; ok?: boolean };

function readSides(formData: FormData) {
  return parseSides(formData.get("front"), formData.get("back"));
}

export async function createCard(_prev: CardFormState, formData: FormData): Promise<CardFormState> {
  const deckId = String(formData.get("deck_id") ?? "");
  const sides = readSides(formData);
  if ("error" in sides) return { error: sides.error };

  const { supabase } = await requireUser();
  // Os campos FSRS usam os defaults da tabela (card novo, due = agora).
  const { error } = await supabase
    .from("cards")
    .insert({ deck_id: deckId, front: sides.front, back: sides.back });
  if (error) return { error: "Não foi possível criar o card." };

  revalidatePath(`/decks/${deckId}`);
  return { ok: true };
}

export async function updateCard(_prev: CardFormState, formData: FormData): Promise<CardFormState> {
  const id = String(formData.get("id") ?? "");
  const deckId = String(formData.get("deck_id") ?? "");
  const sides = readSides(formData);
  if ("error" in sides) return { error: sides.error };

  const { supabase } = await requireUser();
  const { data, error } = await supabase
    .from("cards")
    .update({ front: sides.front, back: sides.back })
    .eq("id", id)
    .select("id");
  if (error || !data?.length) return { error: "Não foi possível guardar o card." };

  revalidatePath(`/decks/${deckId}`);
  return { ok: true };
}

/** Guarda vários cards de uma vez (gerados por IA ou importados) e volta ao deck. */
export async function saveCards(deckId: string, cards: CardSides[]): Promise<{ error?: string }> {
  if (!Array.isArray(cards) || cards.length === 0) return { error: "Escolhe pelo menos um card." };
  if (cards.length > MAX_CARDS_PER_SAVE) {
    return { error: `Podes guardar no máximo ${MAX_CARDS_PER_SAVE} cards de cada vez.` };
  }

  // Inseridos de uma vez, os cards teriam todos a mesma data de criação e
  // perdiam a ordem; um milissegundo de diferença mantém-na.
  const now = Date.now();
  const rows: (CardSides & { deck_id: string; created_at: string })[] = [];
  for (const [i, c] of cards.entries()) {
    const sides = parseSides(c?.front, c?.back);
    if ("error" in sides) return { error: `Card ${i + 1}: ${sides.error}` };
    rows.push({ deck_id: deckId, ...sides, created_at: new Date(now + i).toISOString() });
  }

  const { supabase } = await requireUser();
  // O RLS rejeita a inserção se o deck não for do utilizador.
  const { error } = await supabase.from("cards").insert(rows);
  if (error) return { error: "Não foi possível guardar os cards." };

  revalidatePath(`/decks/${deckId}`);
  redirect(`/decks/${deckId}`);
}

export async function deleteCard(formData: FormData) {
  const id = String(formData.get("id") ?? "");
  const deckId = String(formData.get("deck_id") ?? "");
  const { supabase } = await requireUser();
  await supabase.from("cards").delete().eq("id", id);
  revalidatePath(`/decks/${deckId}`);
}
