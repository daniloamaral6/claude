"use server";

import { revalidatePath } from "next/cache";
import { executar, type Estado } from "@/server/acao";
import { exigirPainel } from "@/server/auth";
import { atualizarCategoria, criarCategoria, excluirCategoria } from "@/server/categorias";

function dados(fd: FormData) {
  return {
    nome: String(fd.get("nome") ?? ""),
    descricao: String(fd.get("descricao") ?? ""),
    paiId: String(fd.get("paiId") ?? "") || null,
    ordem: Number(fd.get("ordem") || 0),
    ativa: fd.get("ativa") === "on",
  };
}

export async function salvarCategoria(_: Estado, fd: FormData): Promise<Estado> {
  const u = await exigirPainel();
  const id = String(fd.get("id") ?? "");
  return executar(async () => {
    if (id) await atualizarCategoria(id, dados(fd), u.id);
    else await criarCategoria(dados(fd), u.id);
    revalidatePath("/admin/categorias");
    return id ? "Categoria salva." : "Categoria criada.";
  });
}

export async function removerCategoria(_: Estado, fd: FormData): Promise<Estado> {
  const u = await exigirPainel();
  return executar(async () => {
    await excluirCategoria(String(fd.get("id")), u.id);
    revalidatePath("/admin/categorias");
    return "Categoria excluída.";
  });
}
