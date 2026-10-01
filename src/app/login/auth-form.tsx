"use client";

import Link from "next/link";
import { useActionState, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { signIn, signInWithGoogle, signUp, type AuthState } from "./actions";

type Mode = "signin" | "signup";

export function AuthForm({
  next,
  initialError,
  google,
}: {
  next?: string;
  initialError?: string;
  google: boolean;
}) {
  const [mode, setMode] = useState<Mode>("signin");

  return (
    <div className="flex flex-col gap-6">
      {google && (
        <>
          <form action={signInWithGoogle}>
            <Button type="submit" variant="secondary" className="w-full">
              <GoogleIcon />
              Continuar com o Google
            </Button>
          </form>
          <div className="flex items-center gap-3 text-xs text-neutral-500" aria-hidden>
            <span className="h-px flex-1 bg-neutral-200 dark:bg-neutral-800" />
            ou
            <span className="h-px flex-1 bg-neutral-200 dark:bg-neutral-800" />
          </div>
        </>
      )}

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
      {mode === "signin" && (
        <Link
          href="/login/reset"
          className="text-center text-sm text-indigo-600 hover:underline dark:text-indigo-400"
        >
          Esqueceste-te da palavra-passe?
        </Link>
      )}
    </form>
  );
}

function GoogleIcon() {
  return (
    <svg viewBox="0 0 48 48" className="size-5" aria-hidden>
      <path fill="#EA4335" d="M24 9.5c3.54 0 6.71 1.22 9.21 3.6l6.85-6.85C35.9 2.38 30.47 0 24 0 14.62 0 6.51 5.38 2.56 13.22l7.98 6.19C12.43 13.72 17.74 9.5 24 9.5z" />
      <path fill="#4285F4" d="M46.98 24.55c0-1.57-.15-3.09-.38-4.55H24v9.02h12.94c-.58 2.96-2.26 5.48-4.78 7.18l7.73 6c4.51-4.18 7.09-10.36 7.09-17.65z" />
      <path fill="#FBBC05" d="M10.53 28.59c-.48-1.45-.76-2.99-.76-4.59s.27-3.14.76-4.59l-7.98-6.19C.92 16.46 0 20.12 0 24c0 3.88.92 7.54 2.56 10.78l7.97-6.19z" />
      <path fill="#34A853" d="M24 48c6.48 0 11.93-2.13 15.89-5.81l-7.73-6c-2.15 1.45-4.92 2.3-8.16 2.3-6.26 0-11.57-4.22-13.47-9.91l-7.98 6.19C6.51 42.62 14.62 48 24 48z" />
    </svg>
  );
}
