import { NextResponse, type NextRequest } from "next/server";
import { updateSession } from "@/lib/supabase/proxy";

// Rotas acessíveis sem sessão. O cron valida o seu próprio segredo.
const PUBLIC_PATHS = ["/login", "/auth", "/offline", "/api/cron"];

function isPublic(pathname: string) {
  return PUBLIC_PATHS.some((p) => pathname === p || pathname.startsWith(`${p}/`));
}

export async function proxy(request: NextRequest) {
  const { response, user } = await updateSession(request);
  const { pathname, search } = request.nextUrl;

  // Quando o destino de um link de email não está nas Redirect URLs, o
  // Supabase envia o código para o Site URL (a raiz): encaminha-o na mesma.
  if (pathname === "/" && request.nextUrl.searchParams.has("code")) {
    return redirectWithCookies(new URL(`/auth/confirm${search}`, request.url), response);
  }

  if (!user && !isPublic(pathname)) {
    const url = new URL("/login", request.url);
    if (pathname !== "/") url.searchParams.set("next", pathname + search);
    return redirectWithCookies(url, response);
  }

  if (user && pathname === "/login") {
    return redirectWithCookies(new URL("/decks", request.url), response);
  }

  return response;
}

// Mantém os cookies de sessão renovados pelo updateSession no redirect.
function redirectWithCookies(url: URL, from: NextResponse) {
  const redirect = NextResponse.redirect(url);
  from.cookies.getAll().forEach((cookie) => redirect.cookies.set(cookie));
  return redirect;
}

export const config = {
  matcher: [
    // Tudo exceto ficheiros estáticos, imagens e o service worker.
    "/((?!_next/static|_next/image|manifest.webmanifest|sw.js|.*\\.(?:svg|png|jpg|jpeg|gif|webp|ico)$).*)",
  ],
};
