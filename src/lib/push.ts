import "server-only";
import webpush from "web-push";

export type PushTarget = { endpoint: string; p256dh: string; auth: string };
export type PushPayload = { title: string; body: string; url: string };

const publicKey = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY;
const privateKey = process.env.VAPID_PRIVATE_KEY;

export function isPushConfigured() {
  return Boolean(publicKey && privateKey);
}

// Contacto que os serviços de push usam em caso de problemas (mailto: ou https:).
function subject() {
  if (process.env.VAPID_SUBJECT) return process.env.VAPID_SUBJECT;
  const host = process.env.VERCEL_PROJECT_PRODUCTION_URL;
  return host ? `https://${host}` : "https://localhost";
}

/**
 * Envia uma notificação. "gone" significa que a subscrição expirou ou foi
 * revogada no dispositivo e deve ser apagada.
 */
export async function sendPush(target: PushTarget, payload: PushPayload): Promise<"sent" | "gone" | "failed"> {
  if (!publicKey || !privateKey) return "failed";
  try {
    await webpush.sendNotification(
      { endpoint: target.endpoint, keys: { p256dh: target.p256dh, auth: target.auth } },
      JSON.stringify(payload),
      { vapidDetails: { subject: subject(), publicKey, privateKey }, TTL: 12 * 60 * 60, timeout: 10_000 },
    );
    return "sent";
  } catch (err) {
    const status = (err as { statusCode?: number })?.statusCode;
    if (status === 404 || status === 410) return "gone";
    console.error("Falha ao enviar notificação push", status ?? err);
    return "failed";
  }
}
