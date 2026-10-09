import type { StatusPedido } from "@/generated/prisma/client";
import { db } from "@/lib/db";
import { registrarAuditoria } from "./auditoria";
import { ErroNegocio } from "./categorias";

export const NOME_STATUS: Record<StatusPedido, string> = {
  AGUARDANDO_PAGAMENTO: "Aguardando pagamento",
  PAGAMENTO_APROVADO: "Pagamento aprovado",
  EM_PREPARACAO: "Em preparação",
  PRONTO_PARA_ENVIO: "Pronto para envio",
  ENVIADO: "Enviado",
  ENTREGUE: "Entregue",
  CANCELADO: "Cancelado",
};

/** Fluxo permitido. Entregue e Cancelado são finais. */
export const TRANSICOES: Record<StatusPedido, StatusPedido[]> = {
  AGUARDANDO_PAGAMENTO: ["PAGAMENTO_APROVADO", "CANCELADO"],
  PAGAMENTO_APROVADO: ["EM_PREPARACAO", "CANCELADO"],
  EM_PREPARACAO: ["PRONTO_PARA_ENVIO", "CANCELADO"],
  PRONTO_PARA_ENVIO: ["ENVIADO", "CANCELADO"],
  ENVIADO: ["ENTREGUE"],
  ENTREGUE: [],
  CANCELADO: [],
};

export async function listarPedidos(f: { status?: StatusPedido; busca?: string; pagina?: number } = {}) {
  const numero = f.busca && /^\d+$/.test(f.busca) ? Number(f.busca) : undefined;
  const where = {
    ...(f.status ? { status: f.status } : {}),
    ...(f.busca ? { OR: [{ nome: { contains: f.busca, mode: "insensitive" as const } }, { email: { contains: f.busca, mode: "insensitive" as const } }, ...(numero ? [{ numero }] : [])] } : {}),
  };
  const pagina = Math.max(1, f.pagina ?? 1);
  const [itens, total] = await Promise.all([
    db.pedido.findMany({ where, orderBy: { criadoEm: "desc" }, skip: (pagina - 1) * 25, take: 25 }),
    db.pedido.count({ where }),
  ]);
  return { itens, total, pagina, paginas: Math.max(1, Math.ceil(total / 25)) };
}

export const obterPedido = (id: string) =>
  db.pedido.findUnique({
    where: { id },
    include: { itens: true, pagamentos: { orderBy: { criadoEm: "desc" } }, historico: { orderBy: { criadoEm: "desc" }, include: { autor: { select: { nome: true, email: true } } } } },
  });

export async function alterarStatusPedido(id: string, para: StatusPedido, autorId: string, extra: { nota?: string; codigoRastreio?: string } = {}) {
  const pedido = await db.pedido.findUnique({ where: { id } });
  if (!pedido) throw new ErroNegocio("Pedido não encontrado.");
  if (!TRANSICOES[pedido.status].includes(para))
    throw new ErroNegocio(`Não é possível mudar de "${NOME_STATUS[pedido.status]}" para "${NOME_STATUS[para]}".`);
  const rastreio = extra.codigoRastreio?.trim() || pedido.codigoRastreio;
  if (para === "ENVIADO" && !rastreio) throw new ErroNegocio("Informe o código de rastreio para marcar como enviado.");
  const nota = extra.nota?.trim() || null;
  if (pedido.status === "AGUARDANDO_PAGAMENTO" && para === "PAGAMENTO_APROVADO" && !nota)
    throw new ErroNegocio("Aprovar o pagamento manualmente exige uma observação (o normal é a confirmação automática do Mercado Pago).");

  await db.$transaction([
    db.pedido.update({
      where: { id },
      data: { status: para, ...(rastreio ? { codigoRastreio: rastreio } : {}), ...(para === "ENVIADO" ? { enviadoEm: new Date() } : {}), ...(para === "ENTREGUE" ? { entregueEm: new Date() } : {}) },
    }),
    db.historicoStatusPedido.create({ data: { pedidoId: id, de: pedido.status, para, nota, autorId } }),
  ]);
  await registrarAuditoria(autorId, "status-pedido", "Pedido", id, { de: pedido.status, para });
}

export async function salvarRastreio(id: string, codigo: string, autorId: string) {
  const limpo = codigo.trim().toUpperCase();
  if (!/^[A-Z0-9-]{6,40}$/.test(limpo)) throw new ErroNegocio("Código de rastreio inválido (6 a 40 letras/números).");
  await db.pedido.update({ where: { id }, data: { codigoRastreio: limpo } });
  await registrarAuditoria(autorId, "rastreio", "Pedido", id);
}
