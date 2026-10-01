"use client";

import { useActionState } from "react";
import { Button } from "@/components/ui/button";
import { createDeck, type FormState } from "./actions";

export function NewDeckForm() {
  const [state, action, pending] = useActionState<FormState, FormData>(createDeck, {});

  return (
    <form action={action} className="flex flex-col gap-2">
      <div className="flex gap-2">
        <input
          name="name"
          required
          maxLength={100}
          placeholder="Nome do novo deck"
          aria-label="Nome do novo deck"
          className="min-h-11 min-w-0 flex-1 rounded-xl border border-neutral-300 bg-white px-3 text-base outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/30 dark:border-neutral-700 dark:bg-neutral-900"
        />
        <Button type="submit" disabled={pending}>
          {pending ? "A criar…" : "Criar"}
        </Button>
      </div>
      {state.error && (
        <p role="alert" className="text-sm text-red-600 dark:text-red-400">
          {state.error}
        </p>
      )}
    </form>
  );
}
