import "server-only";
import type { createClient } from "@/lib/supabase/server";

type Supabase = Awaited<ReturnType<typeof createClient>>;

// Pedidos por utilizador em cada 24 horas. A chave do Gemini é partilhada por
// todos, por isso sem isto uma só conta podia gastar a quota gratuita inteira.
export const AI_LIMITS = { generate: 10, grade: 100 } as const;
export type AiKind = keyof typeof AI_LIMITS;

const WINDOW_MS = 24 * 60 * 60 * 1000;

const LIMIT_MESSAGES: Record<AiKind, string> = {
  generate: `Atingiste o limite de ${AI_LIMITS.generate} gerações por dia. Tenta novamente amanhã.`,
  grade: `Atingiste o limite de ${AI_LIMITS.grade} correções por dia. Avalia tu a resposta por agora.`,
};

/** Pedidos feitos nas últimas 24 horas, ou null se não for possível saber. */
export async function getAiUsage(supabase: Supabase, kind: AiKind): Promise<number | null> {
  const since = new Date(Date.now() - WINDOW_MS).toISOString();
  // Sem `head: true`: num pedido HEAD, uma tabela em falta responde sem corpo e
  // o cliente do Supabase não o trata como erro, o que parecia "0 pedidos".
  const { count, error } = await supabase
    .from("ai_usage")
    .select("id", { count: "exact" })
    .eq("kind", kind)
    .gte("created_at", since)
    .limit(1);
  if (error) {
    // Tabela ainda não criada (migration por aplicar) ou falha pontual.
    console.warn("Não foi possível ler o uso da IA", error.code ?? error.message);
    return null;
  }
  return count ?? 0;
}

/**
 * Regista um pedido à IA, ou devolve um erro se o limite diário foi atingido.
 * Se o registo não estiver disponível, deixa passar: mais vale a
 * funcionalidade sem limite do que parada.
 */
export async function consumeAiQuota(supabase: Supabase, kind: AiKind): Promise<{ error?: string }> {
  const used = await getAiUsage(supabase, kind);
  if (used === null) return {};
  if (used >= AI_LIMITS[kind]) return { error: LIMIT_MESSAGES[kind] };

  const { error } = await supabase.from("ai_usage").insert({ kind });
  if (error) console.warn("Não foi possível registar o uso da IA", error.code ?? error.message);
  return {};
}
