import { db } from "@/lib/db";

/** Registra quem fez o quê no painel. Nunca incluir senhas ou dados sensíveis em `dados`. */
export async function registrarAuditoria(usuarioId: string | null, acao: string, entidade: string, entidadeId?: string | null, dados?: object) {
  await db.logAuditoria.create({ data: { usuarioId, acao, entidade, entidadeId: entidadeId ?? null, dados: dados as never } });
}
