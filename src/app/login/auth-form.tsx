"use client";

import { useActionState, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { signIn, signUp, type AuthState } from "./actions";

type Mode = "signin" | "signup";

export function AuthForm({ next, initialError }: { next?: string; initialError?: string }) {
  const [mode, setMode] = useState<Mode>("signin");

  return (
    <div className="flex flex-col gap-6">
      <div
        role="tablist"
        className="grid grid-cols-2 rounded-xl bg-neutral-100 p-1 dark:bg-neutral-800"
      >
        {(["signin", "signup"] as const).map((m) => (
          <button
            key={m}
            role="tab"
            type="button"
            aria-selected={mode === m}
            onClick={() => setMode(m)}
            className={`min-h-10 rounded-lg text-sm font-medium transition-colors ${
              mode === m
                ? "bg-white text-neutral-900 shadow-sm dark:bg-neutral-950 dark:text-neutral-100"
                : "text-neutral-500"
            }`}
          >
            {m === "signin" ? "Entrar" : "Criar conta"}
          </button>
        ))}
      </div>

      {/* key força um estado limpo ao trocar de separador */}
      <Form
        key={mode}
        mode={mode}
        next={next}
        initialError={mode === "signin" ? initialError : undefined}
      />
    </div>
  );
}

function Form({
  mode,
  next,
  initialError,
}: {
  mode: Mode;
  next?: string;
  initialError?: string;
}) {
  const [state, action, pending] = useActionState<AuthState, FormData>(
    mode === "signin" ? signIn : signUp,
    { error: initialError },
  );

  if (state.message) {
    return (
      <p
        role="status"
        className="rounded-xl bg-emerald-50 p-4 text-sm text-emerald-800 dark:bg-emerald-950 dark:text-emerald-200"
      >
        {state.message}
      </p>
    );
  }

  return (
    <form action={action} className="flex flex-col gap-4">
      {next && <input type="hidden" name="next" value={next} />}
      <Input
        id="email"
        name="email"
        type="email"
        label="Email"
        autoComplete="email"
        inputMode="email"
        required
      />
      <Input
        id="password"
        name="password"
        type="password"
        label="Palavra-passe"
        autoComplete={mode === "signin" ? "current-password" : "new-password"}
        minLength={6}
        required
      />
      {state.error && (
        <p role="alert" className="text-sm text-red-600 dark:text-red-400">
          {state.error}
        </p>
      )}
      <Button type="submit" disabled={pending} className="mt-2">
        {pending ? "Um momento…" : mode === "signin" ? "Entrar" : "Criar conta"}
      </Button>
    </form>
  );
}
