"use client";

import Link from "next/link";
import { useActionState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { updatePassword, type PasswordState } from "../actions";

export function PasswordForm() {
  const [state, action, pending] = useActionState<PasswordState, FormData>(updatePassword, {});

  if (state.ok) {
    return (
      <div className="flex flex-col gap-4">
        <p
          role="status"
          className="rounded-xl bg-emerald-50 p-4 text-sm text-emerald-800 dark:bg-emerald-950 dark:text-emerald-200"
        >
          Palavra-passe alterada.
        </p>
        <Link
          href="/decks"
          className="inline-flex min-h-11 items-center justify-center rounded-xl bg-indigo-600 px-4 text-sm font-medium text-white hover:bg-indigo-500"
        >
          Ir para os decks
        </Link>
      </div>
    );
  }

  return (
    <form action={action} className="flex flex-col gap-4">
      <Input
        id="password"
        name="password"
        type="password"
        label="Nova palavra-passe"
        autoComplete="new-password"
        minLength={6}
        required
      />
      <Input
        id="confirmation"
        name="confirmation"
        type="password"
        label="Repetir palavra-passe"
        autoComplete="new-password"
        minLength={6}
        required
      />
      {state.error && (
        <p role="alert" className="text-sm text-red-600 dark:text-red-400">
          {state.error}
        </p>
      )}
      <Button type="submit" disabled={pending}>
        {pending ? "A guardar…" : "Guardar palavra-passe"}
      </Button>
    </form>
  );
}
