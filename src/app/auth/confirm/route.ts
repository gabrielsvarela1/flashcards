import type { NextRequest } from "next/server";
import { completeAuth } from "@/lib/auth-callback";

/** Destino do link de confirmação de email e do login com Google. */
export function GET(request: NextRequest) {
  return completeAuth(request, "/decks", "confirm");
}
