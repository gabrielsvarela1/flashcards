"use client";

import { useActionState, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { createCard, type CardFormState } from "./card-actions";

export function NewCardForm({ deckId }: { deckId: string }) {
  const formRef = useRef<HTMLFormElement>(null);
  const [state, action, pending] = useActionState<CardFormState, FormData>(
    async (prev, formData) => {
      const result = await createCard(prev, formData);
      if (result.ok) {
        formRef.current?.reset();
        formRef.current?.querySelector("textarea")?.focus();
      }
      return result;
    },
    {},
  );

  return (
    <form
      ref={formRef}
      action={action}
      className="flex flex-col gap-3 rounded-2xl border border-neutral-200 bg-white p-4 dark:border-neutral-800 dark:bg-neutral-900"
    >
      <h2 className="font-medium">Novo card</h2>
      <input type="hidden" name="deck_id" value={deckId} />
      <Textarea id="new-front" name="front" label="Frente" placeholder="Pergunta" required maxLength={2000} />
      <Textarea id="new-back" name="back" label="Verso" placeholder="Resposta" required maxLength={2000} />
      {state.error && (
        <p role="alert" className="text-sm text-red-600 dark:text-red-400">
          {state.error}
        </p>
      )}
      <Button type="submit" disabled={pending}>
        {pending ? "A adicionar…" : "Adicionar card"}
      </Button>
    </form>
  );
}
