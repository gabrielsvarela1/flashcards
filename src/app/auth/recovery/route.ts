import type { NextRequest } from "next/server";
import { completeAuth } from "@/lib/auth-callback";

/** Destino do link de recuperação: abre a sessão e pede a nova palavra-passe. */
export function GET(request: NextRequest) {
  return completeAuth(request, "/account/password", "recovery");
}
