import type { Prisma } from "@/generated/prisma/client";
import { devolverCupom } from "./cupons";

/** Trava a linha do pedido até o fim da transação (evita webhook, expiração e admin mexendo ao mesmo tempo). */
export async function travarPedido(tx: Prisma.TransactionClient, pedidoId: string) {
  await tx.$queryRaw`SELECT "id" FROM "Pedido" WHERE "id" = ${pedidoId} FOR UPDATE`;
}

/** Devolve o estoque reservado e o uso do cupom. Só age uma vez por pedido (marca estoqueDevolvidoEm). */
export async function liberarReservas(tx: Prisma.TransactionClient, pedidoId: string) {
  await travarPedido(tx, pedidoId);
  const pedido = await tx.pedido.findUnique({ where: { id: pedidoId }, include: { itens: true } });
  if (!pedido || pedido.estoqueDevolvidoEm) return false;
  for (const i of pedido.itens) {
    if (i.reservouEstoque && i.variacaoId) await tx.$executeRaw`UPDATE "Variacao" SET "estoque" = "estoque" + ${i.quantidade} WHERE "id" = ${i.variacaoId}`;
  }
  if (pedido.cupomId) await devolverCupom(tx, pedido.cupomId);
  await tx.pedido.update({ where: { id: pedidoId }, data: { estoqueDevolvidoEm: new Date() } });
  return true;
}
