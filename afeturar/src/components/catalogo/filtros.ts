import type { FiltrosCatalogo, Ordem } from "@/server/catalogo";

export type ParamsBusca = Record<string, string | string[] | undefined>;
const um = (v: string | string[] | undefined) => (Array.isArray(v) ? v[0] : v);

/** Lê os filtros da URL com segurança (valores desconhecidos são ignorados). */
export function lerFiltros(sp: ParamsBusca, padrao: { ordem?: Ordem } = {}): FiltrosCatalogo & { q: string } {
  const cores = (Array.isArray(sp.cor) ? sp.cor : sp.cor ? [sp.cor] : []).filter((c) => /^[a-z0-9-]{1,40}$/.test(c)).slice(0, 12);
  const tipo = um(sp.tipo) === "pronta" ? "PRONTA_ENTREGA" : um(sp.tipo) === "encomenda" ? "SOB_ENCOMENDA" : undefined;
  const ordemBruta = um(sp.ordem);
  const ordem: Ordem = ordemBruta === "menor" || ordemBruta === "maior" || ordemBruta === "novidades" ? ordemBruta : (padrao.ordem ?? "novidades");
  const pagina = Math.max(1, Math.min(500, Math.trunc(Number(um(sp.pagina))) || 1));
  const q = (um(sp.q) ?? "").slice(0, 80).trim();
  return { cores, tipo, promocao: um(sp.promo) === "1", ordem, pagina, busca: q || undefined, q };
}

export function temFiltro(sp: ParamsBusca) {
  return Object.keys(sp).some((k) => ["cor", "tipo", "promo", "ordem", "pagina", "q"].includes(k) && sp[k]);
}
