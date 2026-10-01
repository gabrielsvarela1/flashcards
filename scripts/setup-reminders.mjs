// Gera o que é preciso para ligar os lembretes por notificação:
// as chaves VAPID, o segredo do cron e o SQL que guarda o SHA-256 dele.
// Não altera nada: só mostra os valores para colares na Vercel e no Supabase.
//
//   npm run setup:reminders
import { createHash, randomBytes } from "node:crypto";
import webpush from "web-push";

const { publicKey, privateKey } = webpush.generateVAPIDKeys();
const cronSecret = randomBytes(32).toString("hex");
const hash = createHash("sha256").update(cronSecret, "utf8").digest("hex");

console.log(`1) Vercel → Settings → Environment Variables (ambiente Production):

NEXT_PUBLIC_VAPID_PUBLIC_KEY=${publicKey}
VAPID_PRIVATE_KEY=${privateKey}
CRON_SECRET=${cronSecret}

   Marca VAPID_PRIVATE_KEY e CRON_SECRET como "Sensitive". Depois faz um novo deploy.

2) Supabase → SQL Editor (depois de aplicar as migrations):

insert into app_private.settings (key, value)
values ('cron_secret_sha256', '${hash}')
on conflict (key) do update set value = excluded.value;
`);
