import { createHmac, timingSafeEqual } from "node:crypto";
import { ErroPagamento, PagamentoNaoEncontrado, type ConsultaPagamento, type PedidoParaPagar, type ProvedorPagamento, type ResultadoPagamento, type StatusPagamentoProv } from "./tipos";

/**
 * Mercado Pago (API de Pagamentos /v1/payments).
 * ATENÇÃO: implementado conforme a documentação pública; ainda NÃO validado contra a API real (precisa do access token de teste).
 * O cartão usa o token gerado no navegador pelo Mercado Pago (Brick): número/CVV nunca passam pelo nosso servidor.
 */
const API = "https://api.mercadopago.com";

export function mapearStatus(s: unknown): StatusPagamentoProv {
  switch (s) {
    case "approved": return "APROVADO";
    case "rejected": return "RECUSADO";
    case "cancelled": return "CANCELADO";
    case "refunded": case "charged_back": return "ESTORNADO";
    default: return "PENDENTE"; // pending, in_process, authorized, in_mediation…
  }
}

/** Data com fuso de Brasília (-03:00, sem horário de verão desde 2019), como o Mercado Pago espera. */
export function dataComFusoBrasil(d: Date): string {
  const br = new Date(d.getTime() - 3 * 3600_000);
  return `${br.toISOString().slice(0, 23)}-03:00`;
}

export function mercadoPago(opts: { accessToken: string; fetchImpl?: typeof fetch; timeoutMs?: number }): ProvedorPagamento {
  const f = opts.fetchImpl ?? fetch;
  async function chamar(caminho: string, init: { method: string; body?: unknown; idempotencia?: string }) {
    let r: Response;
    try {
      r = await f(`${API}${caminho}`, {
        method: init.method,
        headers: { Authorization: `Bearer ${opts.accessToken}`, "Content-Type": "application/json", ...(init.idempotencia ? { "X-Idempotency-Key": init.idempotencia } : {}) },
        body: init.body ? JSON.stringify(init.body) : undefined, signal: AbortSignal.timeout(opts.timeoutMs ?? 15_000),
      });
    } catch {
      throw new ErroPagamento("Não foi possível falar com o serviço de pagamento agora. Tente novamente.");
    }
    const json = (await r.json().catch(() => ({}))) as Record<string, unknown>;
    if (r.status === 404 && init.method === "GET") throw new PagamentoNaoEncontrado("Pagamento não encontrado.");
    if (!r.ok) {
      console.error("Mercado Pago respondeu", r.status, JSON.stringify(json).slice(0, 300));
      throw new ErroPagamento(r.status >= 500 ? "O serviço de pagamento está instável. Tente novamente em instantes." : "O pagamento não pôde ser processado. Confira os dados e tente novamente.");
    }
    return json;
  }
  const pagador = (p: PedidoParaPagar) => {
    const [primeiro, ...resto] = p.pagador.nome.trim().split(/\s+/);
    return { email: p.pagador.email, first_name: primeiro, last_name: resto.join(" ") || primeiro, identification: { type: "CPF", number: p.pagador.cpf } };
  };
  const base = (p: PedidoParaPagar) => ({
    transaction_amount: Number((p.valorCentavos / 100).toFixed(2)), description: p.descricao, external_reference: p.pedidoId, payer: pagador(p),
    ...(p.urlNotificacao ? { notification_url: p.urlNotificacao } : {}), statement_descriptor: "AFETURAR",
  });
  const ler = (j: Record<string, unknown>): ResultadoPagamento => {
    const td = ((j.point_of_interaction as { transaction_data?: Record<string, unknown> } | undefined)?.transaction_data) ?? {};
    return {
      idExterno: String(j.id), status: mapearStatus(j.status), detalhe: (j.status_detail as string) ?? null,
      pix: td.qr_code ? { copiaECola: String(td.qr_code), qrBase64: (td.qr_code_base64 as string) ?? null, ticketUrl: (td.ticket_url as string) ?? null, expiraEm: j.date_of_expiration ? new Date(String(j.date_of_expiration)) : null } : undefined,
    };
  };

  return {
    nome: "mercado_pago",
    async criarPix(p, expiraEm) {
      return ler(await chamar("/v1/payments", { method: "POST", idempotencia: p.chaveIdempotencia, body: { ...base(p), payment_method_id: "pix", date_of_expiration: dataComFusoBrasil(expiraEm) } }));
    },
    async criarCartao(p, c) {
      return ler(await chamar("/v1/payments", { method: "POST", idempotencia: p.chaveIdempotencia, body: { ...base(p), token: c.token, installments: c.parcelas, payment_method_id: c.metodoId, ...(c.emissorId ? { issuer_id: Number(c.emissorId) } : {}) } }));
    },
    async consultar(idExterno): Promise<ConsultaPagamento> {
      if (!/^\d{1,20}$/.test(idExterno)) throw new ErroPagamento("Identificador de pagamento inválido.");
      const j = await chamar(`/v1/payments/${idExterno}`, { method: "GET" });
      return { idExterno: String(j.id), status: mapearStatus(j.status), detalhe: (j.status_detail as string) ?? null, valorCentavos: Math.round(Number(j.transaction_amount) * 100), moeda: String(j.currency_id ?? "BRL"), referenciaExterna: (j.external_reference as string) ?? null, metodo: j.payment_method_id === "pix" ? "PIX" : "CARTAO" };
    },
  };
}

/**
 * Confere a assinatura do webhook (cabeçalho x-signature = "ts=...,v1=..."):
 * HMAC-SHA256 (hex) da string "id:{data.id};request-id:{x-request-id};ts:{ts};" com a chave secreta do webhook.
 * O `data.id` vem da QUERY da URL (em minúsculas quando alfanumérico).
 */
export function assinaturaWebhookValida(p: { segredo: string; xSignature: string | null; xRequestId: string | null; dataId: string | null }): boolean {
  if (!p.xSignature || !p.segredo) return false;
  let ts: string | undefined, v1: string | undefined;
  for (const parte of p.xSignature.split(",")) {
    const [k, v] = parte.split("=").map((x) => x?.trim());
    if (k === "ts") ts = v; else if (k === "v1") v1 = v;
  }
  if (!ts || !v1 || !/^[0-9a-f]{64}$/i.test(v1)) return false;
  const id = p.dataId ? (/^[a-z0-9]+$/i.test(p.dataId) ? p.dataId.toLowerCase() : p.dataId) : null;
  const manifesto = `${id ? `id:${id};` : ""}${p.xRequestId ? `request-id:${p.xRequestId};` : ""}ts:${ts};`; // partes ausentes saem do manifesto
  const esperado = createHmac("sha256", p.segredo).update(manifesto).digest();
  const recebido = Buffer.from(v1, "hex");
  return recebido.length === esperado.length && timingSafeEqual(recebido, esperado);
}
