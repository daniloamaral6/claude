import { db } from "@/lib/db";
import { registrarAuditoria } from "./auditoria";
import { configuracoesSchema, type ChaveConfiguracao } from "./validacao";

const chaves = Object.keys(configuracoesSchema.shape) as ChaveConfiguracao[];

export async function lerConfiguracoes(): Promise<Record<ChaveConfiguracao, unknown>> {
  const linhas = await db.configuracao.findMany({ where: { chave: { in: chaves } } });
  const mapa = Object.fromEntries(linhas.map((l) => [l.chave, l.valor]));
  return Object.fromEntries(chaves.map((c) => [c, mapa[c] ?? null])) as Record<ChaveConfiguracao, unknown>;
}

/** Valida tudo de uma vez e grava só se estiver correto. Retorna os erros por campo. */
export async function salvarConfiguracoes(entrada: Record<string, unknown>, autorId: string) {
  const r = configuracoesSchema.safeParse(entrada);
  if (!r.success) {
    const erros: Record<string, string> = {};
    for (const i of r.error.issues) erros[String(i.path[0])] = i.message;
    return { ok: false as const, erros };
  }
  await db.$transaction(
    Object.entries(r.data).map(([chave, valor]) =>
      db.configuracao.upsert({ where: { chave }, update: { valor: valor as never }, create: { chave, valor: valor as never } }),
    ),
  );
  await registrarAuditoria(autorId, "atualizar", "Configuracao", null, { chaves: Object.keys(r.data) });
  return { ok: true as const };
}
