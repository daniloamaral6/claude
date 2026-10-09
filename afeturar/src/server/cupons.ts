import { z } from "zod";
import type { Cupom, Prisma } from "@/generated/prisma/client";
import { db } from "@/lib/db";
import { formatarBRL } from "@/lib/moeda";
import { registrarAuditoria } from "./auditoria";
import { ErroNegocio } from "./categorias";

export interface CupomAplicado { cupomId: string; codigo: string; tipo: Cupom["tipo"]; descontoCentavos: number; freteGratis: boolean }

export const normalizarCodigo = (c: unknown) => String(c ?? "").trim().toUpperCase().replace(/\s+/g, "");

/**
 * Valida o cupom para um subtotal. Mensagem genérica quando não existe/venceu/está inativo (não revela quais códigos existem).
 * `agora` é parâmetro para facilitar os testes.
 */
export async function validarCupom(codigoBruto: string, subtotalCentavos: number, agora = new Date(), cliente: Prisma.TransactionClient | typeof db = db): Promise<CupomAplicado> {
  const codigo = normalizarCodigo(codigoBruto);
  const generico = new ErroNegocio("Cupom não encontrado ou expirado.");
  if (!/^[A-Z0-9_-]{3,30}$/.test(codigo)) throw generico;
  const c = await cliente.cupom.findUnique({ where: { codigo } });
  if (!c || !c.ativo || (c.inicioEm && c.inicioEm > agora) || (c.fimEm && c.fimEm <= agora)) throw generico;
  if (c.usoMaximo != null && c.usos >= c.usoMaximo) throw new ErroNegocio("Este cupom atingiu o limite de usos.");
  if (c.minimoCentavos != null && subtotalCentavos < c.minimoCentavos) throw new ErroNegocio(`Este cupom vale para compras a partir de ${formatarBRL(c.minimoCentavos)}.`);
  const desconto = c.tipo === "PERCENTUAL" ? Math.round((subtotalCentavos * c.valor) / 100) : c.tipo === "VALOR_FIXO" ? Math.min(c.valor, subtotalCentavos) : 0;
  return { cupomId: c.id, codigo: c.codigo, tipo: c.tipo, descontoCentavos: Math.min(desconto, subtotalCentavos), freteGratis: c.tipo === "FRETE_GRATIS" };
}

/** Consome 1 uso de forma atômica: se outro pedido pegou o último uso, falha (sem estourar o limite). */
export async function consumirCupom(tx: Prisma.TransactionClient, cupomId: string) {
  const n = await tx.$executeRaw`UPDATE "Cupom" SET "usos" = "usos" + 1 WHERE "id" = ${cupomId} AND "ativo" = true AND ("usoMaximo" IS NULL OR "usos" < "usoMaximo")`;
  if (n !== 1) throw new ErroNegocio("Este cupom atingiu o limite de usos.");
}
export async function devolverCupom(tx: Prisma.TransactionClient, cupomId: string) {
  await tx.$executeRaw`UPDATE "Cupom" SET "usos" = GREATEST("usos" - 1, 0) WHERE "id" = ${cupomId}`;
}

// ───────────── administração ─────────────
const data = z.preprocess((v) => (v === "" || v == null ? null : v), z.coerce.date().nullable());
export const cupomSchema = z.object({
  codigo: z.string().transform(normalizarCodigo).pipe(z.string().regex(/^[A-Z0-9_-]{3,30}$/, "Código com 3 a 30 letras, números, hífen ou sublinhado.")),
  tipo: z.enum(["PERCENTUAL", "VALOR_FIXO", "FRETE_GRATIS"]),
  valor: z.number().int().min(0).max(99_999_999),
  minimoCentavos: z.number().int().min(1).max(99_999_999).nullable(),
  usoMaximo: z.number().int().min(1).max(1_000_000).nullable(),
  inicioEm: data, fimEm: data, ativo: z.boolean(),
}).superRefine((c, ctx) => {
  if (c.tipo === "PERCENTUAL" && (c.valor < 1 || c.valor > 100)) ctx.addIssue({ code: "custom", path: ["valor"], message: "Percentual entre 1 e 100." });
  if (c.tipo === "VALOR_FIXO" && c.valor < 1) ctx.addIssue({ code: "custom", path: ["valor"], message: "Informe o valor do desconto." });
  if (c.inicioEm && c.fimEm && c.fimEm <= c.inicioEm) ctx.addIssue({ code: "custom", path: ["fimEm"], message: "O fim precisa ser depois do início." });
});
export type CupomInput = z.input<typeof cupomSchema>;

export const listarCupons = () => db.cupom.findMany({ orderBy: { criadoEm: "desc" } });

export async function salvarCupom(id: string | null, entrada: unknown, autorId: string) {
  const d = cupomSchema.parse(entrada);
  const dados = { ...d, valor: d.tipo === "FRETE_GRATIS" ? 0 : d.valor };
  try {
    const c = id ? await db.cupom.update({ where: { id }, data: dados }) : await db.cupom.create({ data: dados });
    await registrarAuditoria(autorId, id ? "atualizar" : "criar", "Cupom", c.id, { codigo: c.codigo });
    return c;
  } catch (e) {
    if ((e as { code?: string }).code === "P2002") throw new ErroNegocio("Já existe um cupom com esse código.");
    throw e;
  }
}

export async function excluirCupom(id: string, autorId: string) {
  if ((await db.pedido.count({ where: { cupomId: id } })) > 0) {
    await db.cupom.update({ where: { id }, data: { ativo: false } });
    await registrarAuditoria(autorId, "desativar", "Cupom", id, { motivo: "já usado em pedidos" });
    return { excluido: false as const };
  }
  await db.cupom.delete({ where: { id } });
  await registrarAuditoria(autorId, "excluir", "Cupom", id);
  return { excluido: true as const };
}
