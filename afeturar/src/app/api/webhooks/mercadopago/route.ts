import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { processarNotificacaoPagamento } from "@/server/checkout";
import { assinaturaWebhookValida } from "@/server/pagamentos/mercado-pago";

/**
 * Notificações do Mercado Pago. Segurança:
 *  1) a assinatura (x-signature) é conferida com o segredo do webhook; sem ela, 401;
 *  2) o corpo NÃO é confiável: o estado real do pagamento é consultado na API do Mercado Pago;
 *  3) cada notificação é registrada uma única vez (EventoWebhook): repetições não reprocessam.
 */
export async function POST(req: Request) {
  const segredo = process.env.MERCADO_PAGO_WEBHOOK_SECRET;
  if (!segredo) return NextResponse.json({ erro: "webhook não configurado" }, { status: 503 });
  const url = new URL(req.url);
  const dataId = url.searchParams.get("data.id");
  if (!assinaturaWebhookValida({ segredo, xSignature: req.headers.get("x-signature"), xRequestId: req.headers.get("x-request-id"), dataId })) {
    return NextResponse.json({ erro: "assinatura inválida" }, { status: 401 });
  }
  const corpo = (await req.json().catch(() => null)) as { id?: string | number; type?: string; action?: string; data?: { id?: string | number } } | null;
  const tipo = corpo?.type ?? url.searchParams.get("type");
  if (tipo !== "payment") return NextResponse.json({ ok: true, ignorado: true });
  const idPagamento = String(dataId ?? corpo?.data?.id ?? "");
  if (!/^\d{1,20}$/.test(idPagamento)) return NextResponse.json({ ok: true, ignorado: true });

  const idEvento = String(corpo?.id ?? req.headers.get("x-request-id") ?? `${tipo}:${idPagamento}`).slice(0, 100);
  try {
    await db.eventoWebhook.create({ data: { provedor: "MERCADO_PAGO", idEvento, tipo: corpo?.action ?? tipo, payload: { type: tipo, action: corpo?.action ?? null, dataId: idPagamento } } });
  } catch (e) {
    if ((e as { code?: string }).code !== "P2002") throw e;
    const ja = await db.eventoWebhook.findUnique({ where: { provedor_idEvento: { provedor: "MERCADO_PAGO", idEvento } } });
    if (ja?.processadoEm) return NextResponse.json({ ok: true, duplicado: true });
  }
  try {
    const r = await processarNotificacaoPagamento(idPagamento);
    await db.eventoWebhook.update({ where: { provedor_idEvento: { provedor: "MERCADO_PAGO", idEvento } }, data: { processadoEm: new Date(), erro: null } });
    return NextResponse.json({ ok: true, resultado: r });
  } catch (e) {
    console.error("Erro ao processar webhook do Mercado Pago:", e instanceof Error ? e.message : e);
    await db.eventoWebhook.update({ where: { provedor_idEvento: { provedor: "MERCADO_PAGO", idEvento } }, data: { erro: e instanceof Error ? e.message.slice(0, 300) : "erro" } }).catch(() => {});
    return NextResponse.json({ erro: "falha ao processar" }, { status: 500 }); // o Mercado Pago tenta de novo
  }
}
