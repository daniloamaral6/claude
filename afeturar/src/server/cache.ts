import { revalidateTag, unstable_cache } from "next/cache";

/**
 * Cache dos DADOS da vitrine (produtos, categorias, configurações): evita consultar o banco a cada visita.
 * - Vale por 60 s no máximo (cobre mudanças de estoque feitas por vendas, webhooks e expiração de pedidos).
 * - É apagado na hora quando o painel salva algo (ver invalidarVitrine nas ações do painel) e quando um pedido é criado.
 * - Não guarda resultado "não encontrado" (um erro dentro da função impede que o Next guarde o valor).
 * Em testes e scripts (fora do Next) as funções rodam direto, sem cache.
 */
export const TAG_VITRINE = "vitrine";
const semNext = process.env.NODE_ENV === "test" || !!process.env.VITEST;

export function cacheado<A extends unknown[], R>(fn: (...a: A) => Promise<R>, chave: string, segundos = 60): (...a: A) => Promise<R> {
  if (semNext) return fn;
  return unstable_cache(fn, [chave], { tags: [TAG_VITRINE], revalidate: segundos });
}

export function invalidarVitrine() {
  if (semNext) return;
  try { revalidateTag(TAG_VITRINE, { expire: 0 }); } catch { /* fora de uma requisição do Next (script): nada a invalidar */ }
}

/** Marcador interno: resultado vazio que não deve ser guardado em cache. */
export class NaoEncontrado extends Error {}
/** Cacheia só quando há resultado; `null` nunca fica guardado (evita encher o cache com endereços inexistentes). */
export function cacheadoOuNulo<A extends unknown[], R>(fn: (...a: A) => Promise<R | null>, chave: string, segundos = 60): (...a: A) => Promise<R | null> {
  const interna = cacheado(async (...a: A) => { const r = await fn(...a); if (r === null) throw new NaoEncontrado(); return r; }, chave, segundos);
  return async (...a: A) => { try { return await interna(...a); } catch (e) { if (e instanceof NaoEncontrado) return null; throw e; } };
}
