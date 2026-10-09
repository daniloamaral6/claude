import type { OpcaoFrete } from "./tipos";

/**
 * Frete grátis por valor mínimo: quando o pedido (já com desconto) atinge o limite, a opção MAIS BARATA fica grátis
 * e as demais cobram só a diferença para ela. Cupom de frete grátis aplica a mesma regra.
 */
export function aplicarFreteGratis(opcoes: OpcaoFrete[], opts: { baseCentavos: number; limiteCentavos: number | null; cupomFreteGratis?: boolean }) {
  const gratis = !!opts.cupomFreteGratis || (opts.limiteCentavos != null && opts.baseCentavos >= opts.limiteCentavos);
  if (!gratis || opcoes.length === 0) return opcoes.map((o) => ({ ...o, precoOriginalCentavos: o.precoCentavos, gratis: false }));
  const menor = Math.min(...opcoes.map((o) => o.precoCentavos));
  return opcoes.map((o) => ({ ...o, precoOriginalCentavos: o.precoCentavos, precoCentavos: o.precoCentavos - menor, gratis: o.precoCentavos === menor }));
}
export type OpcaoFreteFinal = ReturnType<typeof aplicarFreteGratis>[number];
