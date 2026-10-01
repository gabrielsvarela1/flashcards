import { createClient } from "@supabase/supabase-js";
import { isPushConfigured, sendPush, type PushTarget } from "@/lib/push";
import { getSupabaseEnv } from "@/lib/supabase/env";

export const maxDuration = 60;

type Target = PushTarget & { due_count: number };

/**
 * Lembrete diário, chamado pelo cron da Vercel (ver vercel.json): envia uma
 * notificação a quem tem cards para rever. A Vercel envia CRON_SECRET no
 * cabeçalho Authorization; o mesmo segredo abre as funções SQL do cron.
 */
export async function GET(request: Request) {
  const secret = process.env.CRON_SECRET;
  if (!secret || request.headers.get("authorization") !== `Bearer ${secret}`) {
    return Response.json({ error: "unauthorized" }, { status: 401 });
  }
  if (!isPushConfigured()) {
    return Response.json({ error: "push not configured" }, { status: 503 });
  }

  // Sem sessão de utilizador: o acesso é dado pelo segredo, dentro das funções.
  const { url, anonKey } = getSupabaseEnv();
  const supabase = createClient(url, anonKey, { auth: { persistSession: false } });

  const { data, error } = await supabase.rpc("push_targets", { p_secret: secret });
  if (error) {
    console.error("Cron: falha ao ler subscrições", error);
    return Response.json({ error: "database" }, { status: 500 });
  }
  const targets = (data ?? []) as Target[];

  const results = await Promise.all(
    targets.map(async (target) => ({
      endpoint: target.endpoint,
      result: await sendPush(target, {
        title: "Hora de rever",
        body:
          target.due_count === 1
            ? "Tens 1 card para rever hoje."
            : `Tens ${target.due_count} cards para rever hoje.`,
        url: "/review/all",
      }),
    })),
  );

  const gone = results.filter((r) => r.result === "gone").map((r) => r.endpoint);
  if (gone.length) {
    const { error: forgetError } = await supabase.rpc("push_forget", { p_secret: secret, p_endpoints: gone });
    if (forgetError) console.error("Cron: falha ao apagar subscrições expiradas", forgetError);
  }

  return Response.json({
    sent: results.filter((r) => r.result === "sent").length,
    expired: gone.length,
    failed: results.filter((r) => r.result === "failed").length,
  });
}
