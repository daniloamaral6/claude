import { timingSafeEqual } from "node:crypto";
import { NextResponse } from "next/server";
import { cancelarExpirados } from "@/server/checkout";

/** Rotina agendada (ex.: Vercel Cron a cada 10 min): cancela pedidos sem pagamento vencidos e devolve o estoque. */
export async function GET(req: Request) {
  const segredo = process.env.CRON_SECRET;
  const recebido = req.headers.get("authorization") ?? "";
  const esperado = `Bearer ${segredo}`;
  if (!segredo || recebido.length !== esperado.length || !timingSafeEqual(Buffer.from(recebido), Buffer.from(esperado))) return NextResponse.json({ erro: "não autorizado" }, { status: 401 });
  return NextResponse.json({ cancelados: await cancelarExpirados() });
}
