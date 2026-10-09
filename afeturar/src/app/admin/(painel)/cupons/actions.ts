"use server";

import { revalidatePath } from "next/cache";
import { textoParaCentavos } from "@/lib/moeda";
import { executar, type Estado } from "@/server/acao";
import { exigirPainel } from "@/server/auth";
import { excluirCupom, salvarCupom } from "@/server/cupons";

const t = (fd: FormData, k: string) => String(fd.get(k) ?? "").trim();
const dataBR = (v: string, fim: boolean) => (v ? `${v}T${fim ? "23:59:59" : "00:00:00"}-03:00` : null); // datas em horário de Brasília

export async function salvarCupomAcao(_: Estado, fd: FormData): Promise<Estado> {
  const u = await exigirPainel();
  const id = t(fd, "id") || null;
  return executar(async () => {
    const tipo = t(fd, "tipo");
    const brutoValor = t(fd, "valor");
    const valor = tipo === "FRETE_GRATIS" ? 0 : tipo === "VALOR_FIXO" ? (textoParaCentavos(brutoValor) ?? Number.NaN) : Number(brutoValor);
    const minimo = t(fd, "minimo");
    await salvarCupom(id, {
      codigo: t(fd, "codigo"), tipo, valor, minimoCentavos: minimo ? (textoParaCentavos(minimo) ?? Number.NaN) : null,
      usoMaximo: t(fd, "usoMaximo") ? Number(t(fd, "usoMaximo")) : null, inicioEm: dataBR(t(fd, "inicio"), false), fimEm: dataBR(t(fd, "fim"), true), ativo: fd.get("ativo") === "on",
    }, u.id);
    revalidatePath("/admin/cupons");
    return id ? "Cupom salvo." : "Cupom criado.";
  });
}

export async function excluirCupomAcao(_: Estado, fd: FormData): Promise<Estado> {
  const u = await exigirPainel();
  return executar(async () => {
    const r = await excluirCupom(t(fd, "id"), u.id);
    revalidatePath("/admin/cupons");
    return r.excluido ? "Cupom excluído." : "Cupom já usado em pedidos: foi apenas desativado.";
  });
}
