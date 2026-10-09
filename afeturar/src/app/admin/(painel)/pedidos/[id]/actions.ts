"use server";

import { revalidatePath } from "next/cache";
import type { StatusPedido } from "@/generated/prisma/client";
import { executar, type Estado } from "@/server/acao";
import { exigirPainel } from "@/server/auth";
import { alterarStatusPedido, NOME_STATUS, salvarRastreio } from "@/server/pedidos";
import { ErroNegocio } from "@/server/categorias";

export async function mudarStatus(_: Estado, fd: FormData): Promise<Estado> {
  const u = await exigirPainel();
  const id = String(fd.get("id"));
  const para = String(fd.get("para"));
  return executar(async () => {
    if (!(para in NOME_STATUS)) throw new ErroNegocio("Status inválido.");
    await alterarStatusPedido(id, para as StatusPedido, u.id, { nota: String(fd.get("nota") ?? ""), codigoRastreio: String(fd.get("rastreio") ?? "") });
    revalidatePath(`/admin/pedidos/${id}`);
    revalidatePath("/admin/pedidos");
    return `Status alterado para "${NOME_STATUS[para as StatusPedido]}".`;
  });
}

export async function gravarRastreio(_: Estado, fd: FormData): Promise<Estado> {
  const u = await exigirPainel();
  const id = String(fd.get("id"));
  return executar(async () => {
    await salvarRastreio(id, String(fd.get("rastreio") ?? ""), u.id);
    revalidatePath(`/admin/pedidos/${id}`);
    return "Código de rastreio salvo.";
  });
}
