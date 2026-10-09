import { mercadoPago } from "./mercado-pago";
import { pagamentoSimulado } from "./simulado";
import type { ProvedorPagamento } from "./tipos";

/**
 * MERCADO_PAGO_ACCESS_TOKEN → Mercado Pago (token de teste ou de produção).
 * PAGAMENTO_SIMULADO=true → simulado (bloqueado em produção).
 */
export function provedorDePagamento(): ProvedorPagamento | null {
  const accessToken = process.env.MERCADO_PAGO_ACCESS_TOKEN;
  if (accessToken) return mercadoPago({ accessToken });
  if (process.env.PAGAMENTO_SIMULADO === "true" && process.env.NODE_ENV !== "production") return pagamentoSimulado;
  return null;
}
export * from "./tipos";
