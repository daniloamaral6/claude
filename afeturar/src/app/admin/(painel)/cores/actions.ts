"use server";

import { revalidatePath } from "next/cache";
import { executar, type Estado } from "@/server/acao";
import { exigirPainel } from "@/server/auth";
import { atualizarCor, criarCor, excluirCor } from "@/server/cores";

const dados = (fd: FormData) => ({ nome: String(fd.get("nome") ?? ""), hex: String(fd.get("hex") ?? "") || null, ativa: fd.get("ativa") === "on" });

export async function salvarCor(_: Estado, fd: FormData): Promise<Estado> {
  const u = await exigirPainel();
  const id = String(fd.get("id") ?? "");
  return executar(async () => {
    if (id) await atualizarCor(id, dados(fd), u.id);
    else await criarCor(dados(fd), u.id);
    revalidatePath("/admin/cores");
    return id ? "Cor salva." : "Cor criada.";
  });
}

export async function removerCor(_: Estado, fd: FormData): Promise<Estado> {
  const u = await exigirPainel();
  return executar(async () => {
    await excluirCor(String(fd.get("id")), u.id);
    revalidatePath("/admin/cores");
    return "Cor excluída.";
  });
}
