export interface Email { para: string; assunto: string; texto: string; html: string }
export interface TransporteEmail { enviar(e: Email): Promise<void> }

/** Resend (https://resend.com): POST /emails. Exige domínio verificado no remetente. */
export function resend(o: { apiKey: string; remetente: string; fetchImpl?: typeof fetch }): TransporteEmail {
  const f = o.fetchImpl ?? fetch;
  return {
    async enviar(e) {
      const r = await f("https://api.resend.com/emails", {
        method: "POST", headers: { Authorization: `Bearer ${o.apiKey}`, "Content-Type": "application/json" },
        body: JSON.stringify({ from: o.remetente, to: [e.para], subject: e.assunto, text: e.texto, html: e.html }), signal: AbortSignal.timeout(10_000),
      });
      if (!r.ok) throw new Error(`Resend respondeu ${r.status}`);
    },
  };
}

/** Em desenvolvimento, mostra o e-mail no console (e guarda numa caixa de saída em memória para os testes). */
export const caixaDeSaida: Email[] = [];
export const transporteDeConsole: TransporteEmail = {
  async enviar(e) { caixaDeSaida.push(e); if (process.env.NODE_ENV !== "test") console.log(`\n[e-mail simulado] Para: ${e.para}\nAssunto: ${e.assunto}\n${e.texto}\n`); },
};

export function transporteDeEmail(): TransporteEmail | null {
  const apiKey = process.env.RESEND_API_KEY, remetente = process.env.EMAIL_REMETENTE;
  if (apiKey && remetente) return resend({ apiKey, remetente });
  return process.env.NODE_ENV === "production" ? null : transporteDeConsole;
}

/** Envio "melhor esforço": e-mail nunca derruba um pedido ou uma troca de status. */
export async function enviarEmailSeguro(e: Email, transporte: TransporteEmail | null = transporteDeEmail()) {
  if (!transporte) { console.warn("E-mail não enviado: configure RESEND_API_KEY e EMAIL_REMETENTE."); return false; }
  try { await transporte.enviar(e); return true; } catch (err) { console.error("Falha ao enviar e-mail:", err instanceof Error ? err.message : err); return false; }
}
