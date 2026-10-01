"use server";

import { requireUser } from "@/lib/auth";
import { isPushConfigured, sendPush } from "@/lib/push";

export type PasswordState = { error?: string; ok?: boolean };

const passwordErrors: Record<string, string> = {
  same_password: "A nova palavra-passe tem de ser diferente da atual.",
  weak_password: "A palavra-passe é demasiado fraca.",
  reauthentication_needed: "Por segurança, sai e volta a entrar antes de mudar a palavra-passe.",
};

export async function updatePassword(_prev: PasswordState, formData: FormData): Promise<PasswordState> {
  const password = String(formData.get("password") ?? "");
  const confirmation = String(formData.get("confirmation") ?? "");
  if (password.length < 6) return { error: "A palavra-passe precisa de pelo menos 6 caracteres." };
  if (password !== confirmation) return { error: "As duas palavras-passe não coincidem." };

  const { supabase } = await requireUser();
  const { error } = await supabase.auth.updateUser({ password });
  if (error) return { error: (error.code && passwordErrors[error.code]) || "Não foi possível mudar a palavra-passe." };

  return { ok: true };
}

export type PushKeys = { endpoint: string; p256dh: string; auth: string };

export async function savePushSubscription(keys: PushKeys): Promise<{ error?: string }> {
  const endpoint = String(keys?.endpoint ?? "");
  const p256dh = String(keys?.p256dh ?? "");
  const auth = String(keys?.auth ?? "");
  if (!endpoint.startsWith("https://") || !p256dh || !auth) return { error: "Subscrição inválida." };

  const { supabase } = await requireUser();
  const { error } = await supabase.rpc("save_push_subscription", {
    p_endpoint: endpoint,
    p_p256dh: p256dh,
    p_auth: auth,
  });
  if (error) {
    console.error("Falha ao guardar subscrição push", error);
    return { error: "Não foi possível ativar os lembretes. Tenta novamente mais tarde." };
  }
  return {};
}

export async function removePushSubscription(endpoint: string): Promise<void> {
  const { supabase } = await requireUser();
  await supabase.from("push_subscriptions").delete().eq("endpoint", String(endpoint));
}

/** Envia uma notificação de teste para este dispositivo. */
export async function sendTestPush(endpoint: string): Promise<{ error?: string }> {
  if (!isPushConfigured()) return { error: "As notificações não estão configuradas nesta instalação." };

  const { supabase } = await requireUser();
  // O RLS só devolve subscrições do próprio utilizador.
  const { data: sub } = await supabase
    .from("push_subscriptions")
    .select("endpoint, p256dh, auth")
    .eq("endpoint", String(endpoint))
    .maybeSingle<PushKeys>();
  if (!sub) return { error: "Este dispositivo não tem os lembretes ativos." };

  const result = await sendPush(sub, {
    title: "Flashcards",
    body: "Os lembretes estão a funcionar. 🎉",
    url: "/decks",
  });
  return result === "sent" ? {} : { error: "Não foi possível enviar a notificação de teste." };
}
