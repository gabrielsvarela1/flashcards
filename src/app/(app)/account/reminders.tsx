"use client";

import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { removePushSubscription, savePushSubscription, sendTestPush } from "./actions";

const VAPID_PUBLIC_KEY = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY;

type Status = "loading" | "unsupported" | "off" | "on";

function urlBase64ToUint8Array(base64: string) {
  const padded = (base64 + "=".repeat((4 - (base64.length % 4)) % 4)).replace(/-/g, "+").replace(/_/g, "/");
  return Uint8Array.from(atob(padded), (c) => c.charCodeAt(0));
}

// O service worker só é registado em produção; sem ele, `ready` nunca resolve.
function serviceWorkerReady() {
  return Promise.race([
    navigator.serviceWorker.ready,
    new Promise<never>((_, reject) => setTimeout(() => reject(new Error("service worker indisponível")), 5000)),
  ]);
}

/** Lembrete diário por notificação push, ativado por dispositivo. */
export function Reminders() {
  const [status, setStatus] = useState<Status>("loading");
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState<{ kind: "error" | "info"; text: string } | null>(null);

  useEffect(() => {
    let active = true;
    const supported = "serviceWorker" in navigator && "PushManager" in window && "Notification" in window;
    (supported ? navigator.serviceWorker.getRegistration() : Promise.resolve(undefined))
      .then((registration) => registration?.pushManager.getSubscription())
      .then((subscription) => {
        if (active) setStatus(!supported ? "unsupported" : subscription ? "on" : "off");
      })
      .catch(() => active && setStatus("off"));
    return () => {
      active = false;
    };
  }, []);

  async function enable() {
    setMessage(null);
    setBusy(true);
    try {
      if ((await Notification.requestPermission()) !== "granted") {
        setMessage({ kind: "error", text: "As notificações estão bloqueadas. Ativa-as nas definições do navegador." });
        return;
      }
      const registration = await serviceWorkerReady();
      const subscription = await registration.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: urlBase64ToUint8Array(VAPID_PUBLIC_KEY!),
      });
      const { endpoint, keys } = subscription.toJSON();
      const result = await savePushSubscription({ endpoint: endpoint!, p256dh: keys!.p256dh, auth: keys!.auth });
      if (result.error) {
        await subscription.unsubscribe();
        setMessage({ kind: "error", text: result.error });
        return;
      }
      setStatus("on");
    } catch {
      setMessage({ kind: "error", text: "Não foi possível ativar os lembretes neste dispositivo." });
    } finally {
      setBusy(false);
    }
  }

  async function disable() {
    setMessage(null);
    setBusy(true);
    try {
      const registration = await serviceWorkerReady();
      const subscription = await registration.pushManager.getSubscription();
      if (subscription) {
        await removePushSubscription(subscription.endpoint);
        await subscription.unsubscribe();
      }
      setStatus("off");
    } catch {
      setMessage({ kind: "error", text: "Não foi possível desativar os lembretes." });
    } finally {
      setBusy(false);
    }
  }

  async function test() {
    setMessage(null);
    setBusy(true);
    try {
      const registration = await serviceWorkerReady();
      const subscription = await registration.pushManager.getSubscription();
      const result = subscription ? await sendTestPush(subscription.endpoint) : { error: "Ativa primeiro os lembretes." };
      setMessage(result.error ? { kind: "error", text: result.error } : { kind: "info", text: "Notificação de teste enviada." });
    } catch {
      setMessage({ kind: "error", text: "Não foi possível enviar a notificação de teste." });
    } finally {
      setBusy(false);
    }
  }

  if (!VAPID_PUBLIC_KEY) {
    return <p className="text-sm text-neutral-500">Os lembretes não estão configurados nesta instalação.</p>;
  }
  if (status === "loading") {
    return <div className="h-11 animate-pulse rounded-xl bg-neutral-100 dark:bg-neutral-800" aria-hidden />;
  }
  if (status === "unsupported") {
    return (
      <p className="text-sm text-neutral-500">
        Este navegador não suporta notificações. No iPhone, adiciona primeiro a app ao ecrã principal (Partilhar →
        Adicionar ao ecrã principal) e abre-a a partir de lá.
      </p>
    );
  }

  return (
    <div className="flex flex-col gap-3">
      <p className="text-sm text-neutral-500">
        {status === "on"
          ? "Ativos neste dispositivo. Recebes uma notificação por dia quando tens cards para rever."
          : "Recebe uma notificação por dia quando tens cards para rever."}
      </p>
      <div className="flex flex-wrap gap-2">
        {status === "on" ? (
          <>
            <Button variant="secondary" onClick={test} disabled={busy}>
              Enviar teste
            </Button>
            <Button variant="ghost" onClick={disable} disabled={busy}>
              Desativar
            </Button>
          </>
        ) : (
          <Button onClick={enable} disabled={busy}>
            {busy ? "A ativar…" : "Ativar lembretes"}
          </Button>
        )}
      </div>
      {message && (
        <p
          role={message.kind === "error" ? "alert" : "status"}
          className={`text-sm ${message.kind === "error" ? "text-red-600 dark:text-red-400" : "text-emerald-700 dark:text-emerald-400"}`}
        >
          {message.text}
        </p>
      )}
    </div>
  );
}
