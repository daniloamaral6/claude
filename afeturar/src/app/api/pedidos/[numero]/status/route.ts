import { NextResponse } from "next/server";
import { obterPedidoPublico } from "@/server/checkout";

/** Usado pela página do pedido para saber se o Pix já foi pago. Exige o código secreto do link. */
export async function GET(req: Request, { params }: { params: Promise<{ numero: string }> }) {
  const numero = Number((await params).numero);
  const codigo = new URL(req.url).searchParams.get("c");
  const p = await obterPedidoPublico(numero, { codigo });
  if (!p) return NextResponse.json({ erro: "não encontrado" }, { status: 404, headers: { "Cache-Control": "no-store" } });
  return NextResponse.json({ status: p.status, pagamento: p.pagamentos[0]?.status ?? null }, { headers: { "Cache-Control": "no-store" } });
}
