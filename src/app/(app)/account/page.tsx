import type { Metadata } from "next";
import Link from "next/link";
import { requireUser } from "@/lib/auth";
import { AI_LIMITS, getAiUsage } from "@/lib/ai-usage";
import { signOut } from "../actions";
import { Reminders } from "./reminders";

export const metadata: Metadata = { title: "Conta · Flashcards" };

const section = "flex flex-col gap-3 rounded-2xl border border-neutral-200 bg-white p-4 dark:border-neutral-800 dark:bg-neutral-900";

export default async function AccountPage() {
  const { supabase, email } = await requireUser();
  const [generations, gradings] = await Promise.all([
    getAiUsage(supabase, "generate"),
    getAiUsage(supabase, "grade"),
  ]);

  return (
    <div className="flex flex-col gap-6">
      <h1 className="text-2xl font-semibold tracking-tight">Conta</h1>

      <section className={section}>
        <h2 className="font-medium">Sessão</h2>
        <p className="break-all text-sm text-neutral-500">{email}</p>
        <div className="flex flex-wrap gap-2">
          <Link
            href="/account/password"
            className="inline-flex min-h-11 items-center justify-center rounded-xl bg-neutral-100 px-4 text-sm font-medium text-neutral-900 hover:bg-neutral-200 dark:bg-neutral-800 dark:text-neutral-100 dark:hover:bg-neutral-700"
          >
            Mudar palavra-passe
          </Link>
          <form action={signOut}>
            <button
              type="submit"
              className="min-h-11 rounded-xl px-4 text-sm font-medium text-red-600 hover:bg-neutral-100 dark:text-red-400 dark:hover:bg-neutral-800"
            >
              Sair
            </button>
          </form>
        </div>
      </section>

      <section className={section}>
        <h2 className="font-medium">Lembretes</h2>
        <Reminders />
      </section>

      {generations !== null && gradings !== null && (
        <section className={section}>
          <h2 className="font-medium">Uso da IA nas últimas 24 horas</h2>
          <dl className="grid grid-cols-2 gap-3 text-sm">
            <div>
              <dt className="text-neutral-500">Gerações de cards</dt>
              <dd className="text-lg font-semibold tabular-nums">
                {generations} / {AI_LIMITS.generate}
              </dd>
            </div>
            <div>
              <dt className="text-neutral-500">Respostas corrigidas</dt>
              <dd className="text-lg font-semibold tabular-nums">
                {gradings} / {AI_LIMITS.grade}
              </dd>
            </div>
          </dl>
        </section>
      )}
    </div>
  );
}
