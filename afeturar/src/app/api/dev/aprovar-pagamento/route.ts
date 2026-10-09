import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { aplicarStatusPagamento } from "@/server/checkout";

/** SOMENTE desenvolvimento com pagamento simulado: marca o Pix de um pedido como pago. Inexistente em produção. */
export async function POST(req: Request) {
  if (process.env.NODE_ENV === "production" || process.env.PAGAMENTO_SIMULADO !== "true") return NextResponse.json({ erro: "indisponível" }, { status: 404 });
  const { numero } = (await req.json().catch(() => ({}))) as { numero?: number };
  const pag = await db.pagamento.findFirst({ where: { pedido: { numero: Number(numero) }, provedor: "SIMULADO", status: "PENDENTE" }, include: { pedido: true } });
  if (!pag?.idExterno) return NextResponse.json({ erro: "pagamento simulado pendente não encontrado" }, { status: 404 });
  const r = await aplicarStatusPagamento({ idExterno: pag.idExterno, status: "APROVADO", detalhe: "accredited", valorCentavos: pag.pedido.totalCentavos, moeda: "BRL", referenciaExterna: pag.pedidoId, metodo: pag.metodo }, "SIMULADO");
  return NextResponse.json({ ok: true, resultado: r });
}
