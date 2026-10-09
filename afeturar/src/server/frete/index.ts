import { melhorEnvio } from "./melhor-envio";
import { freteSimulado } from "./simulado";
import type { ProvedorFrete } from "./tipos";

/**
 * Escolhe o provedor pelas variáveis de ambiente:
 *  - MELHOR_ENVIO_TOKEN (+ MELHOR_ENVIO_AMBIENTE=producao|sandbox, MELHOR_ENVIO_EMAIL_CONTATO) → Melhor Envio
 *  - FRETE_SIMULADO=true → simulado (bloqueado em produção)
 */
export function provedorDeFrete(): ProvedorFrete | null {
  const token = process.env.MELHOR_ENVIO_TOKEN;
  if (token) {
    return melhorEnvio({ token, ambiente: process.env.MELHOR_ENVIO_AMBIENTE === "producao" ? "producao" : "sandbox", emailContato: process.env.MELHOR_ENVIO_EMAIL_CONTATO ?? "contato@afeturar.local" });
  }
  if (process.env.FRETE_SIMULADO === "true" && process.env.NODE_ENV !== "production") return freteSimulado;
  return null;
}
export * from "./tipos";
