"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { executar, type Estado } from "@/server/acao";
import { adicionarItem, ajustarCarrinho, alterarQuantidade, removerItem } from "@/server/carrinho";
import { gravarTokenDoCarrinho, tokenDoCarrinho } from "@/server/carrinho-cookie";
import { ErroNegocio } from "@/server/categorias";

export async function adicionarAoCarrinho(_: Estado, fd: FormData): Promise<Estado> {
  const personalizacao: Record<string, string> = {};
  for (const [k, v] of fd.entries()) if (k.startsWith("pers:") && typeof v === "string") personalizacao[k.slice(5)] = v;
  const intencao = String(fd.get("intencao") ?? "adicionar");
  const estado = await executar(async () => {
    const r = await adicionarItem(await tokenDoCarrinho(), { variacaoId: String(fd.get("variacaoId") ?? ""), quantidade: Number(fd.get("quantidade")), personalizacao });
    if (r.token) await gravarTokenDoCarrinho(r.token);
    revalidatePath("/", "layout"); // atualiza o contador do carrinho no cabeçalho
    return "Adicionado ao carrinho.";
  });
  if (estado.ok && intencao === "comprar") redirect("/carrinho");
  return estado;
}

/** Ações da página do carrinho: em caso de erro voltam com a mensagem na URL (texto próprio, escapado na tela). */
async function comRetorno(fn: () => Promise<void>) {
  let erro: string | null = null;
  try { await fn(); } catch (e) {
    if (e instanceof ErroNegocio) erro = e.message;
    else { console.error(e); erro = "Não foi possível atualizar o carrinho. Tente novamente."; }
  }
  revalidatePath("/", "layout");
  redirect(erro ? `/carrinho?erro=${encodeURIComponent(erro)}` : "/carrinho");
}

export async function mudarQuantidade(fd: FormData) {
  await comRetorno(async () => {
    const atual = Number(fd.get("atual"));
    const novo = fd.get("acao") === "mais" ? atual + 1 : atual - 1;
    const id = String(fd.get("itemId"));
    if (novo < 1) await removerItem(await tokenDoCarrinho(), id);
    else await alterarQuantidade(await tokenDoCarrinho(), id, novo);
  });
}

export async function removerDoCarrinho(fd: FormData) {
  await comRetorno(async () => removerItem(await tokenDoCarrinho(), String(fd.get("itemId"))));
}

export async function ajustarItens() {
  await comRetorno(async () => { await ajustarCarrinho(await tokenDoCarrinho()); });
}
