import { db } from "@/lib/db";

const PAGOS = ["PAGAMENTO_APROVADO", "EM_PREPARACAO", "PRONTO_PARA_ENVIO", "ENVIADO", "ENTREGUE"] as const;

/** Indicadores do dashboard. Faturamento = pedidos com pagamento aprovado ou além (nunca aguardando/cancelado). */
export async function indicadores() {
  const [porStatus, soma, maisVendidos] = await Promise.all([
    db.pedido.groupBy({ by: ["status"], _count: { _all: true } }),
    db.pedido.aggregate({ where: { status: { in: [...PAGOS] } }, _sum: { totalCentavos: true }, _count: { _all: true } }),
    db.itemPedido.groupBy({
      by: ["nomeProduto"], where: { pedido: { status: { in: [...PAGOS] } } },
      _sum: { quantidade: true }, orderBy: { _sum: { quantidade: "desc" } }, take: 5,
    }),
  ]);
  const contagem = Object.fromEntries(porStatus.map((s) => [s.status, s._count._all])) as Record<string, number>;
  const faturamento = soma._sum.totalCentavos ?? 0;
  const pagos = soma._count._all;
  return {
    faturamentoCentavos: faturamento,
    totalPedidos: porStatus.reduce((n, s) => n + s._count._all, 0),
    porStatus: contagem,
    ticketMedioCentavos: pagos ? Math.round(faturamento / pagos) : 0,
    maisVendidos: maisVendidos.map((m) => ({ nome: m.nomeProduto, quantidade: m._sum.quantidade ?? 0 })),
  };
}
