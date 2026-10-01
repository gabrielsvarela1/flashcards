"use client";

import { useEffect } from "react";
import { reportClientError } from "./(app)/actions";
import "./globals.css";

/** Erro no layout de raiz: substitui a página inteira, por isso traz o seu próprio <html>. */
export default function GlobalError({ error, retry }: { error: Error & { digest?: string }; retry: () => void }) {
  useEffect(() => {
    reportClientError({ message: error.message, digest: error.digest, path: window.location.pathname }).catch(() => {});
  }, [error]);

  return (
    <html lang="pt-PT" className="h-full antialiased">
      <body className="flex min-h-full flex-col items-center justify-center gap-4 px-4 text-center font-sans">
        <title>Erro · Flashcards</title>
        <h1 className="text-2xl font-semibold tracking-tight">Algo correu mal</h1>
        <p className="max-w-xs text-neutral-500">Verifica a ligação e tenta outra vez.</p>
        <button
          type="button"
          onClick={retry}
          className="inline-flex min-h-11 items-center justify-center rounded-xl bg-indigo-600 px-4 text-sm font-medium text-white hover:bg-indigo-500"
        >
          Tentar de novo
        </button>
      </body>
    </html>
  );
}
