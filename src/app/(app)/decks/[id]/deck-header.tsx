"use client";

import { useActionState, useState } from "react";
import { Button } from "@/components/ui/button";
import { deleteDeck, renameDeck, type FormState } from "../actions";

export function DeckHeader({ id, name }: { id: string; name: string }) {
  const [editing, setEditing] = useState(false);
  const [state, action, pending] = useActionState<FormState, FormData>(
    async (prev, formData) => {
      const result = await renameDeck(prev, formData);
      if (result.ok) setEditing(false);
      return result;
    },
    {},
  );

  if (editing) {
    return (
      <form action={action} className="flex flex-col gap-2">
        <input type="hidden" name="id" value={id} />
        <input
          name="name"
          defaultValue={name}
          required
          maxLength={100}
          autoFocus
          aria-label="Nome do deck"
          className="min-h-11 rounded-xl border border-neutral-300 bg-white px-3 text-lg font-semibold outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/30 dark:border-neutral-700 dark:bg-neutral-900"
        />
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
    <div className="flex flex-col gap-3">
      <h1 className="break-words text-2xl font-semibold tracking-tight">{name}</h1>
      <div className="flex gap-2">
        <Button variant="secondary" onClick={() => setEditing(true)}>
          Mudar nome
        </Button>
        <form
          action={deleteDeck}
          onSubmit={(e) => {
            if (!confirm(`Apagar "${name}" e todos os seus cards?`)) e.preventDefault();
          }}
        >
          <input type="hidden" name="id" value={id} />
          <Button type="submit" variant="ghost" className="text-red-600 dark:text-red-400">
            Apagar
          </Button>
        </form>
      </div>
    </div>
  );
}
