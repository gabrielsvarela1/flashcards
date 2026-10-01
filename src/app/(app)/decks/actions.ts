"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { requireUser } from "@/lib/auth";

export type FormState = { error?: string; ok?: boolean };

function readName(formData: FormData) {
  const name = String(formData.get("name") ?? "").trim();
  if (!name) return { error: "Dá um nome ao deck." };
  if (name.length > 100) return { error: "O nome pode ter no máximo 100 caracteres." };
  return { name };
}

export async function createDeck(_prev: FormState, formData: FormData): Promise<FormState> {
  const parsed = readName(formData);
  if (!parsed.name) return { error: parsed.error };

  const { supabase } = await requireUser();
  const { data, error } = await supabase
    .from("decks")
    .insert({ name: parsed.name })
    .select("id")
    .single();
  if (error) return { error: "Não foi possível criar o deck." };

  redirect(`/decks/${data.id}`);
}

export async function renameDeck(_prev: FormState, formData: FormData): Promise<FormState> {
  const id = String(formData.get("id") ?? "");
  const parsed = readName(formData);
  if (!parsed.name) return { error: parsed.error };

  const { supabase } = await requireUser();
  // O RLS garante que só o dono altera; 0 linhas = não existe ou não é teu.
  const { data, error } = await supabase
    .from("decks")
    .update({ name: parsed.name })
    .eq("id", id)
    .select("id");
  if (error || !data?.length) return { error: "Não foi possível mudar o nome." };

  revalidatePath(`/decks/${id}`);
  return { ok: true };
}

export async function deleteDeck(formData: FormData) {
  const id = String(formData.get("id") ?? "");
  const { supabase } = await requireUser();
  await supabase.from("decks").delete().eq("id", id);
  redirect("/decks");
}
