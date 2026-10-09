/** Regras de preço e disponibilidade da loja (puras, usadas pelo catálogo, carrinho e checkout). */

export type TipoProduto = "PRONTA_ENTREGA" | "SOB_ENCOMENDA";
export const LIMITE_QUANTIDADE = 20;

export interface ProdutoPreco { tipo: TipoProduto; precoCentavos: number; precoPromocionalCentavos: number | null; prazoPreparoDias: number }
export interface VariacaoPreco { precoCentavos: number | null; precoPromocionalCentavos: number | null; estoque: number; prazoPreparoDias: number | null; disponivel: boolean; ativa: boolean }

/** Preço da variação: usa o próprio se existir, senão o do produto. Promoção só vale se for menor que o preço. */
export function precoDaVariacao(p: ProdutoPreco, v: VariacaoPreco) {
  const preco = v.precoCentavos ?? p.precoCentavos;
  const promo = v.precoPromocionalCentavos ?? p.precoPromocionalCentavos;
  const promocional = promo != null && promo > 0 && promo < preco ? promo : null;
  return { precoCentavos: preco, promocionalCentavos: promocional, finalCentavos: promocional ?? preco };
}

/** Pode ser comprada? Sob encomenda ignora o estoque; pronta entrega exige estoque. */
export function variacaoCompravel(tipo: TipoProduto, v: Pick<VariacaoPreco, "ativa" | "disponivel" | "estoque">) {
  return v.ativa && v.disponivel && (tipo === "SOB_ENCOMENDA" || v.estoque > 0);
}

/** Quantidade máxima por compra (limitada pelo estoque na pronta entrega). */
export function quantidadeMaxima(tipo: TipoProduto, v: Pick<VariacaoPreco, "estoque">) {
  return tipo === "SOB_ENCOMENDA" ? LIMITE_QUANTIDADE : Math.max(0, Math.min(LIMITE_QUANTIDADE, v.estoque));
}

export function prazoDaVariacao(p: Pick<ProdutoPreco, "prazoPreparoDias">, v: Pick<VariacaoPreco, "prazoPreparoDias">) {
  return v.prazoPreparoDias ?? p.prazoPreparoDias;
}

/** Texto de prazo mostrado ao cliente. Só afirma o que está cadastrado. */
export function textoPrazo(tipo: TipoProduto, dias: number) {
  if (dias > 0) return `${tipo === "SOB_ENCOMENDA" ? "Sob encomenda · " : ""}preparo de ${dias} ${dias === 1 ? "dia útil" : "dias úteis"}`;
  return tipo === "SOB_ENCOMENDA" ? "Sob encomenda" : "Pronta para envio";
}
