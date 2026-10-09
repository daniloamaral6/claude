import { randomUUID } from "node:crypto";
import type { ProvedorPagamento } from "./tipos";

/**
 * SOMENTE desenvolvimento/testes. Pix fica pendente (aprove em /api/dev/aprovar-pagamento);
 * cartão aprova, exceto token "recusar". Nunca é usado em produção (ver index.ts).
 */
export const pagamentoSimulado: ProvedorPagamento = {
  nome: "simulado",
  async criarPix(p, expiraEm) {
    return { idExterno: `sim-${randomUUID()}`, status: "PENDENTE", detalhe: "pending_waiting_transfer", pix: { copiaECola: `00020126-SIMULADO-PEDIDO-${p.numero}`, qrBase64: null, ticketUrl: null, expiraEm } };
  },
  async criarCartao(_p, c) {
    return c.token === "recusar" ? { idExterno: `sim-${randomUUID()}`, status: "RECUSADO", detalhe: "cc_rejected_other_reason" } : { idExterno: `sim-${randomUUID()}`, status: "APROVADO", detalhe: "accredited" };
  },
  async consultar(idExterno) { return { idExterno, status: "PENDENTE", detalhe: null, valorCentavos: 0, moeda: "BRL", referenciaExterna: null, metodo: "PIX" }; },
};
