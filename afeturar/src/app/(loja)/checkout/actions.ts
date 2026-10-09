"use server";

import { ZodError } from "zod";
import { cepValido, somenteDigitos } from "@/lib/validacoes";
import { tokenDoCarrinho } from "@/server/carrinho-cookie";
import { clienteAtual } from "@/server/auth-cliente";
import { ErroNegocio } from "@/server/categorias";
import { cotarCarrinho, criarPedido } from "@/server/checkout";
import { errosDoZod } from "@/server/formularios";
import { ipDoCliente, permitir } from "@/server/limite";
import { lerCarrinho } from "@/server/carrinho";
import { validarCupom } from "@/server/cupons";

type Falha = { ok: false; erro: string; erros?: Record<string, string> };
type Resp<T> = ({ ok: true } & T) | Falha;

async function seguro<T extends object>(fn: () => Promise<T>): Promise<Resp<T>> {
  try { return { ok: true, ...(await fn()) }; } catch (e) {
    if (e instanceof ZodError) return { ok: false, erro: "Confira os campos destacados.", erros: errosDoZod(e.issues) };
    if (e instanceof ErroNegocio) return { ok: false, erro: e.message };
    console.error("Erro no checkout:", e);
    return { ok: false, erro: "Não foi possível concluir agora. Tente novamente em instantes." };
  }
}
const limitado = async (acao: string, max: number) => (await permitir(`${acao}:${await ipDoCliente()}`, max, 10 * 60_000)) ? null : ({ ok: false, erro: "Muitas tentativas. Aguarde alguns minutos e tente de novo." } as Falha);

/** Preenche o endereço pelo CEP (ViaCEP). Se o serviço falhar, a pessoa digita à mão. */
export async function buscarCep(cep: string): Promise<Resp<{ logradouro: string; bairro: string; cidade: string; uf: string }>> {
  const bloqueio = await limitado("cep", 40); if (bloqueio) return bloqueio;
  if (!cepValido(cep)) return { ok: false, erro: "CEP inválido." };
  try {
    const r = await fetch(`https://viacep.com.br/ws/${somenteDigitos(cep)}/json/`, { signal: AbortSignal.timeout(4000), cache: "no-store" });
    const j = (await r.json()) as { erro?: boolean; logradouro?: string; bairro?: string; localidade?: string; uf?: string };
    if (!r.ok || j.erro || !j.uf) return { ok: false, erro: "Não encontramos esse CEP. Preencha o endereço manualmente." };
    return { ok: true, logradouro: String(j.logradouro ?? "").slice(0, 160), bairro: String(j.bairro ?? "").slice(0, 80), cidade: String(j.localidade ?? "").slice(0, 80), uf: String(j.uf).slice(0, 2) };
  } catch { return { ok: false, erro: "Não foi possível buscar o CEP agora. Preencha o endereço manualmente." }; }
}

export async function cotarFrete(entrada: { cep: string; cupom?: string | null }) {
  const bloqueio = await limitado("frete", 30); if (bloqueio) return bloqueio;
  return seguro(async () => {
    const { cotacao } = await cotarCarrinho(await tokenDoCarrinho(), { cep: String(entrada.cep ?? ""), cupom: entrada.cupom ? String(entrada.cupom) : null });
    return { opcoes: cotacao.opcoes.map((o) => ({ id: o.id, nome: o.nome, empresa: o.empresa, precoCentavos: o.precoCentavos, precoOriginalCentavos: o.precoOriginalCentavos, gratis: o.gratis, prazoDias: o.prazoDias })), prazoPreparoDias: cotacao.prazoPreparoDias, descontoCentavos: cotacao.descontoCentavos };
  });
}

export async function aplicarCupom(codigo: string) {
  const bloqueio = await limitado("cupom", 20); if (bloqueio) return bloqueio;
  return seguro(async () => {
    const cart = await lerCarrinho(await tokenDoCarrinho());
    const c = await validarCupom(String(codigo ?? ""), cart.subtotalCentavos);
    return { codigo: c.codigo, descontoCentavos: c.descontoCentavos, freteGratis: c.freteGratis };
  });
}

/** Fecha o pedido. Devolve a URL da página do pedido; em caso de erro, a tela gera uma nova chave de idempotência. */
export async function finalizarPedido(payload: unknown) {
  const bloqueio = await limitado("pedido", 12); if (bloqueio) return bloqueio;
  return seguro(async () => {
    const cliente = await clienteAtual();
    const r = await criarPedido(payload as Parameters<typeof criarPedido>[0], await tokenDoCarrinho(), cliente?.id ?? null);
    return { url: `/pedido/${r.numero}?c=${r.tokenAcesso}`, pago: r.pago };
  });
}
