"use server";

import { requireUser } from "@/lib/auth";
import { consumeAiQuota } from "@/lib/ai-usage";
import type { CardSides } from "@/lib/cards";
import { FSRS_COLUMNS, fromFsrsCard, isGrade, scheduler, toFsrsCard, type FsrsFields } from "@/lib/fsrs";
import { GenerationError, gradeAnswer, type Verdict } from "@/lib/gemini";
import { MAX_ANSWER_CHARS } from "@/lib/limits";
import { errorDetail, logError } from "@/lib/log";

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

  const { error: historyError } = await supabase.from("reviews").insert({
    card_id: cardId,
    rating,
    reviewed_at: now.toISOString(),
    state_before: row,
    state_after: after,
  });
  if (historyError) console.error("Falha ao registar review", historyError);

  return { ok: true, due: after.due };
}

export type CheckResult = { ok: true; verdict: Verdict; feedback: string } | { ok: false; error: string };

/** Corrige com IA uma resposta escrita. A avaliação final continua a ser do utilizador. */
export async function checkAnswer(cardId: string, answer: string): Promise<CheckResult> {
  const text = typeof answer === "string" ? answer.trim() : "";
  if (!text) return { ok: false, error: "Escreve uma resposta primeiro." };
  if (text.length > MAX_ANSWER_CHARS) {
    return { ok: false, error: `A resposta pode ter no máximo ${MAX_ANSWER_CHARS} caracteres.` };
  }

  const { supabase } = await requireUser();

  // O card é lido no servidor: o cliente não escolhe a resposta de referência.
  const { data: card } = await supabase
    .from("cards")
    .select("front, back")
    .eq("id", cardId)
    .maybeSingle<CardSides>();
  if (!card) return { ok: false, error: "Card não encontrado." };

  const quota = await consumeAiQuota(supabase, "grade");
  if (quota.error) return { ok: false, error: quota.error };

  try {
    return { ok: true, ...(await gradeAnswer(card, text)) };
  } catch (err) {
    const known = err instanceof GenerationError;
    await logError(supabase, {
      source: "server",
      message: known ? err.message : "Falha inesperada ao corrigir uma resposta",
      detail: known ? undefined : errorDetail(err),
      path: "/review",
    });
    return { ok: false, error: known ? err.message : "Não foi possível corrigir a resposta." };
  }
}
