"use client";

import { useEffect } from "react";
import { Button } from "@/components/ui/button";
import { reportClientError } from "./actions";

export default function AppError({ error, retry }: { error: Error & { digest?: string }; retry: () => void }) {
  useEffect(() => {
    // Sem rede o pedido falha também: não há nada a fazer com esse segundo erro.
    reportClientError({ message: error.message, digest: error.digest, path: window.location.pathname }).catch(() => {});
  }, [error]);

  return (
    <div className="flex flex-1 flex-col items-center justify-center gap-4 text-center">
      <h1 className="text-2xl font-semibold tracking-tight">Algo correu mal</h1>
      <p className="max-w-xs text-neutral-500">Verifica a ligação e tenta outra vez.</p>
      {/* retry volta a pedir os dados ao servidor, em vez de só repetir a renderização. */}
      <Button onClick={retry}>Tentar de novo</Button>
    </div>
  );
}
