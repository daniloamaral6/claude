import { NextResponse, type NextRequest } from "next/server";

/**
 * Primeira barreira do painel: sem cookie de sessão, vai para o login.
 * A validação REAL (sessão no banco + papel) é feita em cada página e ação via exigirPainel().
 */
export function proxy(req: NextRequest) {
  const { pathname } = req.nextUrl;
  if (pathname === "/admin/login") return NextResponse.next();
  const cookie = req.cookies.get(process.env.NODE_ENV === "production" ? "__Host-afeturar" : "afeturar_sessao");
  if (!cookie?.value) return NextResponse.redirect(new URL("/admin/login", req.url));
  return NextResponse.next();
}

export const config = { matcher: ["/admin/:path*"] };
