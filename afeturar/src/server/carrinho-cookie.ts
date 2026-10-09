import "server-only";
import { cookies } from "next/headers";
import { DURACAO_CARRINHO_MS } from "./carrinho";

const producao = process.env.NODE_ENV === "production";
const NOME = producao ? "__Host-afeturar_carrinho" : "afeturar_carrinho";

export async function tokenDoCarrinho() {
  return (await cookies()).get(NOME)?.value ?? null;
}

export async function gravarTokenDoCarrinho(token: string) {
  (await cookies()).set(NOME, token, { httpOnly: true, secure: producao, sameSite: "lax", path: "/", maxAge: DURACAO_CARRINHO_MS / 1000 });
}
