"use client";

import { Button } from "@/components/ui/button";

export default function AppError({ reset }: { error: Error & { digest?: string }; reset: () => void }) {
  return (
    <div className="flex flex-1 flex-col items-center justify-center gap-4 text-center">
      <h1 className="text-2xl font-semibold tracking-tight">Algo correu mal</h1>
      <p className="max-w-xs text-neutral-500">Verifica a ligação e tenta outra vez.</p>
      <Button onClick={reset}>Tentar de novo</Button>
    </div>
  );
}
