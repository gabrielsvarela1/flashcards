import type { Metadata } from "next";
import Link from "next/link";
import { ResetForm } from "./reset-form";

export const metadata: Metadata = { title: "Recuperar palavra-passe · Flashcards" };

export default function ResetPage() {
  return (
    <main className="flex flex-1 flex-col items-center justify-center px-4 py-10">
      <div className="flex w-full max-w-sm flex-col gap-6">
        <div className="text-center">
          <h1 className="text-2xl font-semibold tracking-tight">Recuperar palavra-passe</h1>
          <p className="mt-2 text-sm text-neutral-500">
            Enviamos-te um link por email para definires uma nova palavra-passe.
          </p>
        </div>
        <ResetForm />
        <Link href="/login" className="text-center text-sm text-neutral-500 hover:text-neutral-800 dark:hover:text-neutral-200">
          ← Voltar ao login
        </Link>
      </div>
    </main>
  );
}
