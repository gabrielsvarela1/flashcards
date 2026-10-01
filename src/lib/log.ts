import "server-only";
import type { createClient } from "@/lib/supabase/server";

type Supabase = Awaited<ReturnType<typeof createClient>>;

export type ErrorReport = {
  source: "server" | "client";
  message: string;
  detail?: string;
  path?: string;
};

/**
 * Guarda um erro na tabela error_logs (os logs da Vercel no plano gratuito
 * duram uma hora). Nunca lança: registar um erro não pode causar outro.
 */
export async function logError(supabase: Supabase, { source, message, detail, path }: ErrorReport) {
  console.error(`[${source}] ${message}`, detail ?? "");
  try {
    const { error } = await supabase.from("error_logs").insert({
      source,
      message: message.slice(0, 2000),
      detail: detail?.slice(0, 8000),
      path: path?.slice(0, 500),
    });
    if (error) console.warn("Não foi possível guardar o erro", error.code ?? error.message);
  } catch (e) {
    console.warn("Não foi possível guardar o erro", e);
  }
}

export function errorDetail(err: unknown) {
  if (err instanceof Error) return err.stack ?? `${err.name}: ${err.message}`;
  return String(err);
}
