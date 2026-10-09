import { createHmac, randomUUID } from "node:crypto";
import { afterAll, afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { POST } from "../src/app/api/webhooks/mercadopago/route";
import { adicionarItem } from "../src/server/carrinho";
import { criarPedido } from "../src/server/checkout";
import { caixaDeSaida, transporteDeConsole } from "../src/server/email";
import { freteSimulado } from "../src/server/frete/simulado";
import type { ProvedorPagamento } from "../src/server/pagamentos/tipos";
import { limparBanco, prisma } from "./helpers";

const SEGREDO = "segredo-de-teste";
beforeEach(async () => { await limparBanco(); caixaDeSaida.length = 0; process.env.MERCADO_PAGO_WEBHOOK_SECRET = SEGREDO; process.env.MERCADO_PAGO_ACCESS_TOKEN = "TEST-token"; });
afterEach(() => { vi.unstubAllGlobals(); delete process.env.MERCADO_PAGO_ACCESS_TOKEN; delete process.env.MERCADO_PAGO_WEBHOOK_SECRET; });
afterAll(() => prisma.$disconnect());

async function pedidoComPagamento(idMp = "5551234") {
  await prisma.configuracao.create({ data: { chave: "frete.cepOrigem", valor: "01001000" } });
  const cat = await prisma.categoria.create({ data: { slug: "c", nome: "C" } });
  const p = await prisma.produto.create({ data: { slug: "v", nome: "Vaso", precoCentavos: 5000, categoriaId: cat.id, ativo: true, pesoEmbalagemG: 300, compEmbalagemMm: 200, largEmbalagemMm: 150, altEmbalagemMm: 100, variacoes: { create: { sku: "V-1", estoque: 5 } } }, include: { variacoes: true } });
  const token = (await adicionarItem(null, { variacaoId: p.variacoes[0].id, quantidade: 1 })).token!;
  const prov: ProvedorPagamento = { nome: "mercado_pago", criarPix: async (_p, expiraEm) => ({ idExterno: idMp, status: "PENDENTE", detalhe: null, pix: { copiaECola: "000201", qrBase64: null, ticketUrl: null, expiraEm } }), criarCartao: vi.fn(), consultar: vi.fn() };
  const r = await criarPedido({ contato: { email: "a@b.com", nome: "Ana Souza", telefone: "11999990000", cpf: "52998224725" }, entrega: { destinatario: "Ana", cep: "01001000", logradouro: "Rua", numero: "1", bairro: "Sé", cidade: "SP", uf: "SP" }, freteId: "simulado:pac", pagamento: { metodo: "PIX" }, aceitouTermos: true, chaveIdempotencia: randomUUID() }, token, null, { frete: freteSimulado, pagamento: prov, email: transporteDeConsole });
  return prisma.pedido.findUniqueOrThrow({ where: { numero: r.numero } });
}

function requisicao(opts: { dataId?: string; corpo?: object; assinar?: boolean; ts?: string; requestId?: string; tipo?: string }) {
  const dataId = opts.dataId ?? "5551234", requestId = opts.requestId ?? randomUUID(), ts = opts.ts ?? String(Date.now());
  const v1 = createHmac("sha256", SEGREDO).update(`id:${dataId};request-id:${requestId};ts:${ts};`).digest("hex");
  const headers: Record<string, string> = { "content-type": "application/json", "x-request-id": requestId };
  if (opts.assinar !== false) headers["x-signature"] = `ts=${ts},v1=${v1}`;
  return new Request(`https://loja.exemplo/api/webhooks/mercadopago?data.id=${dataId}&type=${opts.tipo ?? "payment"}`, { method: "POST", headers, body: JSON.stringify(opts.corpo ?? { id: 98765, type: "payment", action: "payment.updated", data: { id: dataId } }) });
}
const mpResponde = (p: { id: string; status: string; valor: number; ref: string }) =>
  vi.stubGlobal("fetch", vi.fn(async () => new Response(JSON.stringify({ id: Number(p.id), status: p.status, status_detail: "accredited", transaction_amount: p.valor, currency_id: "BRL", external_reference: p.ref, payment_method_id: "pix" }), { status: 200 })));

describe("POST /api/webhooks/mercadopago", () => {
  it("recusa sem assinatura, com assinatura errada e sem segredo configurado", async () => {
    await pedidoComPagamento();
    expect((await POST(requisicao({ assinar: false }))).status).toBe(401);
    const adulterada = requisicao({ dataId: "5551234" });
    const h = new Headers(adulterada.headers); h.set("x-signature", `ts=1,v1=${"a".repeat(64)}`);
    expect((await POST(new Request(adulterada.url, { method: "POST", headers: h, body: "{}" }))).status).toBe(401);
    vi.stubGlobal("fetch", vi.fn(async () => new Response("{}", { status: 404 })));
    const desconhecido = await POST(requisicao({ dataId: "999", corpo: {} })); // assinada, mas o pagamento não existe (ex.: teste do painel)
    expect([desconhecido.status, (await desconhecido.json()).resultado]).toEqual([200, "ignorado"]);
    delete process.env.MERCADO_PAGO_WEBHOOK_SECRET;
    expect((await POST(requisicao({}))).status).toBe(503);
    expect(await prisma.eventoWebhook.count({ where: { idEvento: "98765" } })).toBe(0); // nada foi processado sem assinatura válida
  });

  it("aprova o pedido consultando o Mercado Pago (não confia no corpo) e registra o evento", async () => {
    const ped = await pedidoComPagamento();
    mpResponde({ id: "5551234", status: "approved", valor: ped.totalCentavos / 100, ref: ped.id });
    const r = await POST(requisicao({ corpo: { id: 111, type: "payment", action: "payment.updated", data: { id: "5551234" }, status: "approved", transaction_amount: 0.01 } })); // corpo mente; só a consulta vale
    expect(r.status).toBe(200);
    expect((await prisma.pedido.findUniqueOrThrow({ where: { id: ped.id } })).status).toBe("PAGAMENTO_APROVADO");
    const ev = await prisma.eventoWebhook.findFirstOrThrow({ where: { idEvento: "111" } });
    expect(ev.processadoEm).not.toBeNull();
    const chamada = (fetch as unknown as ReturnType<typeof vi.fn>).mock.calls[0];
    expect(String(chamada[0])).toBe("https://api.mercadopago.com/v1/payments/5551234");
  });

  it("notificação repetida não reprocessa (nem reenvia e-mail)", async () => {
    const ped = await pedidoComPagamento();
    mpResponde({ id: "5551234", status: "approved", valor: ped.totalCentavos / 100, ref: ped.id });
    await POST(requisicao({ corpo: { id: 222, type: "payment", data: { id: "5551234" } } }));
    caixaDeSaida.length = 0;
    const r2 = await POST(requisicao({ corpo: { id: 222, type: "payment", data: { id: "5551234" } } }));
    expect(await r2.json()).toMatchObject({ duplicado: true });
    expect(caixaDeSaida).toHaveLength(0);
    expect(await prisma.eventoWebhook.count({ where: { idEvento: "222" } })).toBe(1);
    expect(await prisma.historicoStatusPedido.count({ where: { pedidoId: ped.id, para: "PAGAMENTO_APROVADO" } })).toBe(1);
  });

  it("valor divergente não aprova; tipos que não são pagamento são ignorados", async () => {
    const ped = await pedidoComPagamento();
    mpResponde({ id: "5551234", status: "approved", valor: 1, ref: ped.id });
    expect(await (await POST(requisicao({ corpo: { id: 333, type: "payment", data: { id: "5551234" } } }))).json()).toMatchObject({ resultado: "divergente" });
    expect((await prisma.pedido.findUniqueOrThrow({ where: { id: ped.id } })).status).toBe("AGUARDANDO_PAGAMENTO");
    expect(await (await POST(requisicao({ tipo: "merchant_order", corpo: { id: 444, type: "merchant_order", data: { id: "5551234" } } }))).json()).toMatchObject({ ignorado: true });
    expect(await prisma.eventoWebhook.count({ where: { idEvento: "444" } })).toBe(0);
  });

  it("se a consulta ao Mercado Pago falhar responde 500 (para ele tentar de novo) e a nova tentativa funciona", async () => {
    const ped = await pedidoComPagamento();
    vi.stubGlobal("fetch", vi.fn(async () => new Response("{}", { status: 503 })));
    expect((await POST(requisicao({ corpo: { id: 555, type: "payment", data: { id: "5551234" } } }))).status).toBe(500);
    expect((await prisma.eventoWebhook.findFirstOrThrow({ where: { idEvento: "555" } })).erro).toBeTruthy();
    mpResponde({ id: "5551234", status: "approved", valor: ped.totalCentavos / 100, ref: ped.id });
    expect((await POST(requisicao({ corpo: { id: 555, type: "payment", data: { id: "5551234" } } }))).status).toBe(200);
    expect((await prisma.pedido.findUniqueOrThrow({ where: { id: ped.id } })).status).toBe("PAGAMENTO_APROVADO");
    expect((await prisma.eventoWebhook.findFirstOrThrow({ where: { idEvento: "555" } })).processadoEm).not.toBeNull();
  });
});
