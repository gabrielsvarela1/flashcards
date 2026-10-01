"use client";

import { useCallback, useSyncExternalStore } from "react";

const EVENT = "local-flag";

function subscribe(onChange: () => void) {
  window.addEventListener("storage", onChange);
  window.addEventListener(EVENT, onChange);
  return () => {
    window.removeEventListener("storage", onChange);
    window.removeEventListener(EVENT, onChange);
  };
}

function read(key: string) {
  try {
    return localStorage.getItem(key) === "1";
  } catch {
    // Modo privado ou armazenamento bloqueado: a preferência não fica guardada.
    return false;
  }
}

/** Preferência booleana guardada no dispositivo (localStorage). */
export function useLocalFlag(key: string) {
  const value = useSyncExternalStore(
    subscribe,
    () => read(key),
    () => false,
  );

  const set = useCallback(
    (next: boolean) => {
      try {
        localStorage.setItem(key, next ? "1" : "0");
      } catch {}
      window.dispatchEvent(new Event(EVENT));
    },
    [key],
  );

  return [value, set] as const;
}
