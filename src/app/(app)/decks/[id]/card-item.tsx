"use client";

import { useActionState, useState } from "react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { formatDue } from "@/lib/format";
import { deleteCard, updateCard, type CardFormState } from "./card-actions";

type Props = {
  id: string;
  deckId: string;
  front: string;
  back: string;
  due: string;
  isNew: boolean;
};

export function CardItem({ id, deckId, front, back, due, isNew }: Props) {
  const [editing, setEditing] = useState(false);
  const [state, action, pending] = useActionState<CardFormState, FormData>(
    async (prev, formData) => {
      const result = await updateCard(prev, formData);
      if (result.ok) setEditing(false);
      return result;
    },
    {},
  );

  if (editing) {
    return (
      <form
        action={action}
        className="flex flex-col gap-3 rounded-2xl border border-indigo-300 bg-white p-4 dark:border-indigo-800 dark:bg-neutral-900"
      >
        <input type="hidden" name="id" value={id} />
        <input type="hidden" name="deck_id" value={deckId} />
        <Textarea id={`front-${id}`} name="front" label="Frente" defaultValue={front} required maxLength={2000} autoFocus />
        <Textarea id={`back-${id}`} name="back" label="Verso" defaultValue={back} required maxLength={2000} />
        {state.error && (
          <p role="alert" className="text-sm text-red-600 dark:text-red-400">
            {state.error}
          </p>
        )}
        <div className="flex gap-2">
          <Button type="submit" disabled={pending}>
            Guardar
          </Button>
          <Button type="button" variant="ghost" onClick={() => setEditing(false)}>
            Cancelar
          </Button>
        </div>
      </form>
    );
  }

  return (
    <div className="flex flex-col gap-3 rounded-2xl border border-neutral-200 bg-white p-4 dark:border-neutral-800 dark:bg-neutral-900">
      <div className="flex flex-col gap-1">
        <p className="whitespace-pre-wrap break-words font-medium">{front}</p>
        <p className="whitespace-pre-wrap break-words text-sm text-neutral-500">{back}</p>
      </div>
      <div className="flex items-center justify-between gap-2">
        <span className="text-xs text-neutral-500">{isNew ? "Novo" : formatDue(due)}</span>
        <div className="flex gap-1">
          <Button variant="ghost" className="min-h-9 px-3" onClick={() => setEditing(true)}>
            Editar
          </Button>
          <form
            action={deleteCard}
            onSubmit={(e) => {
              if (!confirm("Apagar este card?")) e.preventDefault();
            }}
          >
            <input type="hidden" name="id" value={id} />
            <input type="hidden" name="deck_id" value={deckId} />
            <Button type="submit" variant="ghost" className="min-h-9 px-3 text-red-600 dark:text-red-400">
              Apagar
            </Button>
          </form>
        </div>
      </div>
    </div>
  );
}
