import type { Metadata } from "next";
import { ReloadButton } from "./reload-button";

export const metadata: Metadata = { title: "Sem ligação · Flashcards" };

/** Mostrada pelo service worker quando se abre a app sem rede. */
export default function OfflinePage() {
  return (
    <main className="flex flex-1 flex-col items-center justify-center gap-4 px-4 text-center">
      <div className="text-5xl" aria-hidden>
        📡
      </div>
      <h1 className="text-2xl font-semibold tracking-tight">Sem ligação à internet</h1>
      <p className="max-w-xs text-neutral-500">
        Os teus cards estão guardados na tua conta. Volta a tentar quando tiveres rede.
      </p>
      <ReloadButton />
    </main>
  );
}
