/** Aceita só caminhos internos (evita open redirect via ?next=). */
export function safeNext(next: unknown, fallback = "/decks") {
  if (typeof next !== "string") return fallback;
  if (!next.startsWith("/") || next.startsWith("//") || next.startsWith("/\\")) {
    return fallback;
  }
  return next;
}
