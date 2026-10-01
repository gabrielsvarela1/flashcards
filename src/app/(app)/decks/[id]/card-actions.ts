"use server";

import { revalidatePath } from "next/cache";
import { requireUser } from "@/lib/auth";
import { parseSides } from "@/lib/cards";

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

export async function deleteCard(formData: FormData) {
  const id = String(formData.get("id") ?? "");
  const deckId = String(formData.get("deck_id") ?? "");
  const { supabase } = await requireUser();
  await supabase.from("cards").delete().eq("id", id);
  revalidatePath(`/decks/${deckId}`);
}
