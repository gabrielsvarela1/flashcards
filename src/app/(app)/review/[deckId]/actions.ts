"use server";

import { requireUser } from "@/lib/auth";
import { FSRS_COLUMNS, fromFsrsCard, isGrade, scheduler, toFsrsCard, type FsrsFields } from "@/lib/fsrs";

export type ReviewResult = { ok: true; due: string } | { ok: false; error: string };

export async function submitReview(cardId: string, rating: number): Promise<ReviewResult> {
  if (!isGrade(rating)) return { ok: false, error: "Resposta inválida." };

  const { supabase } = await requireUser();

  const { data: row } = await supabase
    .from("cards")
    .select(FSRS_COLUMNS)
    .eq("id", cardId)
    .maybeSingle<FsrsFields>();
  if (!row) return { ok: false, error: "Card não encontrado." };

  // O cálculo é feito no servidor: o cliente só envia a resposta.
  const now = new Date();
  const { card } = scheduler.next(toFsrsCard(row), now, rating);
  const after = fromFsrsCard(card);

  // reps funciona como versão: se outro pedido já reviu o card, não
  // aplicamos a mesma revisão duas vezes (duplo toque, dois separadores).
  const { data: updated, error } = await supabase
    .from("cards")
    .update(after)
    .eq("id", cardId)
    .eq("reps", row.reps)
    .select("id");
  if (error) return { ok: false, error: "Não foi possível guardar a revisão." };
  if (!updated?.length) return { ok: false, error: "Este card já foi revisto." };

  const { error: logError } = await supabase.from("reviews").insert({
    card_id: cardId,
    rating,
    reviewed_at: now.toISOString(),
    state_before: row,
    state_after: after,
  });
  if (logError) console.error("Falha ao registar review", logError);

  return { ok: true, due: after.due };
}
