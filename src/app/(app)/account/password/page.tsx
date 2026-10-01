import type { Metadata } from "next";
import Link from "next/link";
import { PasswordForm } from "./password-form";

export const metadata: Metadata = { title: "Palavra-passe · Flashcards" };

export default function PasswordPage() {
  return (
    <div className="flex flex-col gap-6">
      <Link href="/account" className="text-sm text-neutral-500 hover:text-neutral-800 dark:hover:text-neutral-200">
        ← Conta
      </Link>
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Nova palavra-passe</h1>
        <p className="mt-1 text-neutral-500">Escolhe uma palavra-passe com pelo menos 6 caracteres.</p>
      </div>
      <PasswordForm />
    </div>
  );
}
