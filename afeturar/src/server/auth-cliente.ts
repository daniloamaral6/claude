import "server-only";
import { cache } from "react";
import { cookies, headers } from "next/headers";
import { criarSessao, encerrarSessao, validarSessao } from "./sessao";

const producao = process.env.NODE_ENV === "production";
export const COOKIE_CLIENTE = producao ? "__Host-afeturar_cliente" : "afeturar_cliente";

export async function iniciarSessaoCliente(usuarioId: string) {
  const { token, expiraEm } = await criarSessao(usuarioId, (await headers()).get("user-agent"));
  (await cookies()).set(COOKIE_CLIENTE, token, { httpOnly: true, secure: producao, sameSite: "lax", path: "/", expires: expiraEm });
}

export async function sairCliente() {
  const jar = await cookies();
  await encerrarSessao(jar.get(COOKIE_CLIENTE)?.value);
  jar.delete(COOKIE_CLIENTE);
}

/** Cliente logado (ou null). Só aceita sessões de conta CLIENTE: o cookie do painel não vale aqui e vice-versa. */
export const clienteAtual = cache(async () => {
  const u = await validarSessao((await cookies()).get(COOKIE_CLIENTE)?.value);
  return u && u.papel === "CLIENTE" ? u : null;
});
