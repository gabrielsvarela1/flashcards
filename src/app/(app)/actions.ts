"use server";

import { redirect } from "next/navigation";
import { logError } from "@/lib/log";
import { createClient } from "@/lib/supabase/server";

export async function signOut() {
  const supabase = await createClient();
  await supabase.auth.signOut();
  redirect("/login");
}

/** Chamado pelos ecrãs de erro, para o erro ficar registado e não só no browser de quem o viu. */
export async function reportClientError(report: { message: string; digest?: string; path?: string }) {
  const supabase = await createClient();
  const { data } = await supabase.auth.getClaims();
  // Sem sessão não há onde guardar: a tabela só aceita linhas do próprio utilizador.
  if (!data?.claims) return;

  await logError(supabase, {
    source: "client",
    message: String(report?.message ?? "Erro sem mensagem"),
    detail: report?.digest ? `digest: ${String(report.digest)}` : undefined,
    path: report?.path ? String(report.path) : undefined,
  });
}
