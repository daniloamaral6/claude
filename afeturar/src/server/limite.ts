import "server-only";
import { headers } from "next/headers";

/**
 * Limite simples de tentativas em memória (por instância). Protege contra repetição acidental e abuso leve;
 * contra ataque distribuído use também o limite do provedor de hospedagem/CDN (ver README).
 */
const janelas = new Map<string, { n: number; ate: number }>();

export function permitir(chave: string, max: number, janelaMs: number): boolean {
  const agora = Date.now();
  if (janelas.size > 5000) for (const [k, v] of janelas) if (v.ate < agora) janelas.delete(k);
  const j = janelas.get(chave);
  if (!j || j.ate < agora) { janelas.set(chave, { n: 1, ate: agora + janelaMs }); return true; }
  j.n++;
  return j.n <= max;
}

export async function ipDoCliente(): Promise<string> {
  const h = await headers();
  return h.get("x-forwarded-for")?.split(",")[0]?.trim() || h.get("x-real-ip") || "desconhecido";
}
