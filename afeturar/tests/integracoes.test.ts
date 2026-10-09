import { createHmac } from "node:crypto";
import { describe, expect, it, vi } from "vitest";
import { cepValido, cpfValido, formatarCpf, mascararCpf, telefoneValido } from "../src/lib/validacoes";
import { transporteDeConsole, caixaDeSaida, enviarEmailSeguro, resend } from "../src/server/email";
import { emailPedidoEnviado, emailPedidoRecebido, emailRecuperarSenha, type PedidoEmail } from "../src/server/email/modelos";
import { melhorEnvio } from "../src/server/frete/melhor-envio";
import { aplicarFreteGratis } from "../src/server/frete/regras";
import { freteSimulado } from "../src/server/frete/simulado";
import { assinaturaWebhookValida, dataComFusoBrasil, mapearStatus, mercadoPago } from "../src/server/pagamentos/mercado-pago";

const resposta = (corpo: unknown, status = 200) => new Response(JSON.stringify(corpo), { status, headers: { "Content-Type": "application/json" } });

describe("validações brasileiras", () => {
  it("CPF: dígitos verificadores e sequências repetidas", () => {
    expect(cpfValido("529.982.247-25")).toBe(true);
    expect(cpfValido("52998224725")).toBe(true);
    expect(cpfValido("529.982.247-24")).toBe(false);
    expect(cpfValido("111.111.111-11")).toBe(false);
    expect(cpfValido("123")).toBe(false);
    expect(cpfValido(null)).toBe(false);
  });
  it("CEP, telefone e máscara de CPF (LGPD)", () => {
    expect(cepValido("01001-000")).toBe(true);
    expect(cepValido("0100100")).toBe(false);
    expect(cepValido("00000000")).toBe(false);
    expect(telefoneValido("(11) 99999-0000")).toBe(true);
    expect(telefoneValido("1234")).toBe(false);
    expect(formatarCpf("52998224725")).toBe("529.982.247-25");
    expect(mascararCpf("52998224725")).toBe("•••.•••.•••-25");
    expect(mascararCpf("x")).toBe("—");
  });
});

describe("frete: Melhor Envio", () => {
  const itens = [{ id: "p1", larguraCm: 5, alturaCm: 1, comprimentoCm: 10, pesoKg: 0.05, valorCentavos: 4990, quantidade: 2 }];
  it("monta a requisição conforme a API (sandbox, token, User-Agent, mínimos dos Correios)", async () => {
    const f = vi.fn(async () => resposta([]));
    await melhorEnvio({ token: "TKN", emailContato: "oi@afeturar.com.br", fetchImpl: f as unknown as typeof fetch }).cotar("01001000", "20040020", itens);
    const [url, init] = f.mock.calls[0] as unknown as [string, RequestInit];
    expect(url).toBe("https://sandbox.melhorenvio.com.br/api/v2/me/shipment/calculate");
    expect((init.headers as Record<string, string>).Authorization).toBe("Bearer TKN");
    expect((init.headers as Record<string, string>)["User-Agent"]).toBe("Afeturar (oi@afeturar.com.br)");
    expect(JSON.parse(init.body as string)).toEqual({
      from: { postal_code: "01001000" }, to: { postal_code: "20040020" },
      products: [{ id: "p1", width: 11, height: 2, length: 16, weight: 0.1, insurance_value: 49.9, quantity: 2 }],
      options: { receipt: false, own_hand: false },
    });
    await melhorEnvio({ token: "T", ambiente: "producao", emailContato: "a@b.com", fetchImpl: f as unknown as typeof fetch }).cotar("1", "2", itens);
    expect((f.mock.calls[1] as unknown as [string])[0]).toBe("https://melhorenvio.com.br/api/v2/me/shipment/calculate");
  });
  it("converte a resposta, descarta serviços com erro e ordena por preço", async () => {
    const f = async () => resposta([
      { id: 2, name: "SEDEX", price: "38.50", delivery_time: 2, company: { name: "Correios" } },
      { id: 1, name: "PAC", price: "21.90", custom_price: "20.90", delivery_time: 6, company: { name: "Correios" } },
      { id: 3, name: ".Package", error: "Serviço indisponível" },
      { id: 4, name: "Sem preço" },
    ]);
    const r = await melhorEnvio({ token: "T", emailContato: "a@b.com", fetchImpl: f as unknown as typeof fetch }).cotar("a", "b", itens);
    expect(r).toEqual([
      { id: "melhor_envio:1", nome: "PAC", empresa: "Correios", precoCentavos: 2090, prazoDias: 6 },
      { id: "melhor_envio:2", nome: "SEDEX", empresa: "Correios", precoCentavos: 3850, prazoDias: 2 },
    ]);
  });
  it("erros viram mensagens amigáveis (sem vazar detalhes)", async () => {
    const mk = (f: unknown) => melhorEnvio({ token: "T", emailContato: "a@b.com", fetchImpl: f as typeof fetch });
    await expect(mk(async () => resposta({ message: "Unauthenticated" }, 401)).cotar("a", "b", itens)).rejects.toThrow(/frete/i);
    await expect(mk(async () => { throw new Error("ECONNRESET token=T"); }).cotar("a", "b", itens)).rejects.toThrow(/Tente novamente/);
    await expect(mk(async () => resposta({ nao: "lista" })).cotar("a", "b", itens)).rejects.toThrow(/inesperada/);
    await expect(mk(async () => resposta({}, 500)).cotar("a", "b", itens)).rejects.not.toThrow(/Unauthenticated|ECONNRESET|token/);
  });
  it("provedor simulado é determinístico", async () => {
    const r = await freteSimulado.cotar("1", "01001000", itens);
    expect(r.map((o) => o.id)).toEqual(["simulado:pac", "simulado:sedex"]);
    expect(r[0].precoCentavos).toBe(1700);
  });
});

describe("frete grátis", () => {
  const ops = [{ id: "a", nome: "PAC", empresa: "", precoCentavos: 2000, prazoDias: 6 }, { id: "b", nome: "SEDEX", empresa: "", precoCentavos: 3500, prazoDias: 2 }];
  it("abaixo do limite cobra normal; no limite a mais barata é grátis e as outras cobram a diferença", () => {
    expect(aplicarFreteGratis(ops, { baseCentavos: 29899, limiteCentavos: 29900 }).map((o) => o.precoCentavos)).toEqual([2000, 3500]);
    const r = aplicarFreteGratis(ops, { baseCentavos: 29900, limiteCentavos: 29900 });
    expect(r.map((o) => [o.precoCentavos, o.gratis, o.precoOriginalCentavos])).toEqual([[0, true, 2000], [1500, false, 3500]]);
    expect(aplicarFreteGratis(ops, { baseCentavos: 99999, limiteCentavos: null }).every((o) => !o.gratis)).toBe(true);
    expect(aplicarFreteGratis(ops, { baseCentavos: 100, limiteCentavos: null, cupomFreteGratis: true })[0].precoCentavos).toBe(0);
    expect(aplicarFreteGratis([], { baseCentavos: 1, limiteCentavos: 1 })).toEqual([]);
  });
});

describe("pagamento: Mercado Pago", () => {
  const pedido = { pedidoId: "ped1", numero: 7, valorCentavos: 12345, descricao: "Pedido 7", pagador: { email: "a@b.com", nome: "Ana Maria Silva", cpf: "52998224725" }, urlNotificacao: "https://loja.com/api/webhooks/mercadopago", chaveIdempotencia: "idem-1" };
  it("Pix: requisição correta e leitura do QR code", async () => {
    const f = vi.fn(async () => resposta({ id: 123456789, status: "pending", status_detail: "pending_waiting_transfer", date_of_expiration: "2026-10-10T12:30:00.000-03:00", point_of_interaction: { transaction_data: { qr_code: "000201...", qr_code_base64: "iVBOR...", ticket_url: "https://mp/ticket" } } }, 201));
    const r = await mercadoPago({ accessToken: "TEST-1", fetchImpl: f as unknown as typeof fetch }).criarPix(pedido, new Date("2026-10-10T15:30:00Z"));
    const [url, init] = f.mock.calls[0] as unknown as [string, RequestInit];
    const h = init.headers as Record<string, string>;
    expect(url).toBe("https://api.mercadopago.com/v1/payments");
    expect(h.Authorization).toBe("Bearer TEST-1"); expect(h["X-Idempotency-Key"]).toBe("idem-1");
    expect(JSON.parse(init.body as string)).toEqual({
      transaction_amount: 123.45, description: "Pedido 7", external_reference: "ped1", payment_method_id: "pix", date_of_expiration: "2026-10-10T12:30:00.000-03:00",
      payer: { email: "a@b.com", first_name: "Ana", last_name: "Maria Silva", identification: { type: "CPF", number: "52998224725" } },
      notification_url: "https://loja.com/api/webhooks/mercadopago", statement_descriptor: "AFETURAR",
    });
    expect(r).toMatchObject({ idExterno: "123456789", status: "PENDENTE", pix: { copiaECola: "000201...", qrBase64: "iVBOR...", ticketUrl: "https://mp/ticket" } });
    expect(r.pix?.expiraEm?.toISOString()).toBe("2026-10-10T15:30:00.000Z");
  });
  it("cartão: envia token (nunca dados do cartão) e parcelas; aprovado/recusado", async () => {
    const f = vi.fn(async () => resposta({ id: 55, status: "approved", status_detail: "accredited" }, 201));
    const mp = mercadoPago({ accessToken: "T", fetchImpl: f as unknown as typeof fetch });
    const r = await mp.criarCartao(pedido, { token: "tok_abc", metodoId: "visa", emissorId: "24", parcelas: 3 });
    const corpo = JSON.parse((f.mock.calls[0] as unknown as [string, RequestInit])[1].body as string);
    expect(corpo).toMatchObject({ token: "tok_abc", installments: 3, payment_method_id: "visa", issuer_id: 24 });
    expect(JSON.stringify(corpo)).not.toMatch(/card_number|security_code|cvv/i);
    expect(r.status).toBe("APROVADO");
    const rec = await mercadoPago({ accessToken: "T", fetchImpl: (async () => resposta({ id: 56, status: "rejected", status_detail: "cc_rejected_insufficient_amount" }, 201)) as unknown as typeof fetch }).criarCartao(pedido, { token: "t", metodoId: "visa", parcelas: 1 });
    expect(rec).toMatchObject({ status: "RECUSADO", detalhe: "cc_rejected_insufficient_amount" });
  });
  it("consulta o pagamento e valida o id; erros não vazam detalhes", async () => {
    const f = vi.fn(async () => resposta({ id: 99, status: "approved", transaction_amount: 12.5, currency_id: "BRL", external_reference: "ped9", payment_method_id: "pix" }));
    const mp = mercadoPago({ accessToken: "T", fetchImpl: f as unknown as typeof fetch });
    expect(await mp.consultar("99")).toEqual({ idExterno: "99", status: "APROVADO", detalhe: null, valorCentavos: 1250, moeda: "BRL", referenciaExterna: "ped9", metodo: "PIX" });
    expect((f.mock.calls[0] as unknown as [string])[0]).toBe("https://api.mercadopago.com/v1/payments/99");
    await expect(mp.consultar("../../users")).rejects.toThrow(/inválido/);
    await expect(mercadoPago({ accessToken: "T", fetchImpl: (async () => resposta({ message: "not found" }, 404)) as unknown as typeof fetch }).consultar("1")).rejects.toBeInstanceOf((await import("../src/server/pagamentos/tipos")).PagamentoNaoEncontrado);
    await expect(mercadoPago({ accessToken: "T", fetchImpl: (async () => resposta({ message: "invalid_token SEGREDO" }, 401)) as unknown as typeof fetch }).consultar("1")).rejects.not.toThrow(/SEGREDO|invalid_token/);
  });
  it("mapeia status e formata a data em horário de Brasília", () => {
    expect(["approved", "pending", "in_process", "authorized", "rejected", "cancelled", "refunded", "charged_back", "algo-novo"].map(mapearStatus)).toEqual(["APROVADO", "PENDENTE", "PENDENTE", "PENDENTE", "RECUSADO", "CANCELADO", "ESTORNADO", "ESTORNADO", "PENDENTE"]);
    expect(dataComFusoBrasil(new Date("2026-10-10T03:05:09.123Z"))).toBe("2026-10-10T00:05:09.123-03:00");
  });
});

describe("webhook do Mercado Pago: assinatura", () => {
  const segredo = "segredo-do-webhook";
  const assinar = (manifesto: string) => createHmac("sha256", segredo).update(manifesto).digest("hex");
  const base = { segredo, xRequestId: "req-abc-123", dataId: "123456" };
  it("aceita assinatura correta (manifesto oficial id;request-id;ts)", () => {
    const v1 = assinar("id:123456;request-id:req-abc-123;ts:1742505638683;");
    expect(assinaturaWebhookValida({ ...base, xSignature: `ts=1742505638683,v1=${v1}` })).toBe(true);
    expect(assinaturaWebhookValida({ ...base, xSignature: `v1=${v1}, ts=1742505638683` })).toBe(true); // ordem/espaços
  });
  it("id alfanumérico é comparado em minúsculas (regra oficial)", () => {
    const v1 = assinar("id:abc123;request-id:req-abc-123;ts:1;");
    expect(assinaturaWebhookValida({ ...base, dataId: "ABC123", xSignature: `ts=1,v1=${v1}` })).toBe(true);
  });
  it("partes ausentes saem do manifesto", () => {
    const v1 = assinar("id:123456;ts:1;");
    expect(assinaturaWebhookValida({ ...base, xRequestId: null, xSignature: `ts=1,v1=${v1}` })).toBe(true);
  });
  it("recusa adulteração de qualquer parte, segredo errado e formatos inválidos", () => {
    const v1 = assinar("id:123456;request-id:req-abc-123;ts:1;");
    const ok = { ...base, xSignature: `ts=1,v1=${v1}` };
    expect(assinaturaWebhookValida(ok)).toBe(true);
    expect(assinaturaWebhookValida({ ...ok, dataId: "123457" })).toBe(false);
    expect(assinaturaWebhookValida({ ...ok, xRequestId: "outro" })).toBe(false);
    expect(assinaturaWebhookValida({ ...ok, xSignature: `ts=2,v1=${v1}` })).toBe(false);
    expect(assinaturaWebhookValida({ ...ok, segredo: "errado" })).toBe(false);
    expect(assinaturaWebhookValida({ ...ok, segredo: "" })).toBe(false);
    for (const x of [null, "", "ts=1", "v1=abc", "ts=1,v1=curto", `ts=1,v1=${"z".repeat(64)}`]) expect(assinaturaWebhookValida({ ...base, xSignature: x })).toBe(false);
  });
});

describe("e-mails", () => {
  const p: PedidoEmail = { numero: 12, nome: "Ana <script>", email: "ana@x.com", totalCentavos: 11000, subtotalCentavos: 10000, descontoCentavos: 0, freteCentavos: 1000, tokenAcesso: "tok123", codigoRastreio: "AB123BR", freteServico: "PAC",
    itens: [{ nomeProduto: "Vaso <b>X</b>", quantidade: 2, precoUnitarioCentavos: 5000, corNome: "Branco" }] };
  it("escapam HTML de dados do cliente e trazem o link do pedido", () => {
    for (const e of [emailPedidoRecebido(p, "PIX"), emailPedidoEnviado(p)]) {
      expect(e.html).not.toContain("<script>"); expect(e.html).not.toContain("<b>X</b>");
      expect(e.texto).toContain("/pedido/12?c=tok123");
    }
    expect(emailPedidoRecebido(p, "PIX").texto).toMatch(/Pix/); expect(emailPedidoEnviado(p).texto).toContain("AB123BR");
    expect(emailRecuperarSenha("a@b.com", "Ana", "https://x/redefinir?t=1").texto).toContain("https://x/redefinir?t=1");
  });
  it("transporte Resend monta a requisição; falha de envio nunca lança", async () => {
    const f = vi.fn(async () => new Response("{}", { status: 200 }));
    await resend({ apiKey: "re_1", remetente: "Afeturar <p@afeturar.com.br>", fetchImpl: f as unknown as typeof fetch }).enviar({ para: "a@b.com", assunto: "Oi", texto: "t", html: "<p>h</p>" });
    const [url, init] = f.mock.calls[0] as unknown as [string, RequestInit];
    expect(url).toBe("https://api.resend.com/emails"); expect(JSON.parse(init.body as string)).toMatchObject({ from: "Afeturar <p@afeturar.com.br>", to: ["a@b.com"], subject: "Oi" });
    const quebrado = { enviar: async () => { throw new Error("falhou"); } };
    expect(await enviarEmailSeguro({ para: "a@b.com", assunto: "x", texto: "x", html: "x" }, quebrado)).toBe(false);
    expect(await enviarEmailSeguro({ para: "a@b.com", assunto: "x", texto: "x", html: "x" }, null)).toBe(false);
    caixaDeSaida.length = 0;
    expect(await enviarEmailSeguro({ para: "a@b.com", assunto: "ok", texto: "x", html: "x" }, transporteDeConsole)).toBe(true);
    expect(caixaDeSaida).toHaveLength(1);
  });
});
