import "server-only";
import { cache } from "react";
import { cookies, headers } from "next/headers";
import { redirect } from "next/navigation";
import { criarSessao, encerrarSessao, validarSessao } from "./sessao";

const producao = process.env.NODE_ENV === "production";
/** Prefixo __Host- exige Secure + Path=/ e impede que subdomínios sobrescrevam o cookie. */
export const COOKIE_SESSAO = producao ? "__Host-afeturar" : "afeturar_sessao";

export async function iniciarSessaoNoCookie(usuarioId: string) {
  const ua = (await headers()).get("user-agent");
  const { token, expiraEm } = await criarSessao(usuarioId, ua);
  (await cookies()).set(COOKIE_SESSAO, token, { httpOnly: true, secure: producao, sameSite: "lax", path: "/", expires: expiraEm });
}

export async function sairDoPainel() {
  const jar = await cookies();
  await encerrarSessao(jar.get(COOKIE_SESSAO)?.value);
  jar.delete(COOKIE_SESSAO);
}

/** Usuário logado do painel (ou null). Memoizado por requisição. */
export const usuarioDoPainel = cache(async () => {
  const usuario = await validarSessao((await cookies()).get(COOKIE_SESSAO)?.value);
  return usuario && (usuario.papel === "ADMIN" || usuario.papel === "EQUIPE") ? usuario : null;
});

/** Use no começo de TODA página e ação do painel. `soAdmin` restringe a quem tem papel ADMIN. */
export async function exigirPainel(opcoes: { soAdmin?: boolean } = {}) {
  const usuario = await usuarioDoPainel();
  if (!usuario) redirect("/admin/login");
  if (opcoes.soAdmin && usuario.papel !== "ADMIN") redirect("/admin?aviso=sem-permissao");
  return usuario;
}
