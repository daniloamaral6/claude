import type { Prisma } from "@/generated/prisma/client";
import { db } from "@/lib/db";
import { precoDaVariacao, prazoDaVariacao, quantidadeMaxima, variacaoCompravel, type TipoProduto } from "@/lib/preco";
import { normalizarBusca } from "./busca";

/** Leituras PÚBLICAS da loja. Só devolve produtos publicados em categorias ativas. */

export const POR_PAGINA = 12;

const visivel: Prisma.ProdutoWhereInput = {
  ativo: true,
  variacoes: { some: { ativa: true } },
  categoria: { ativa: true, OR: [{ paiId: null }, { pai: { ativa: true } }] },
};

export interface CartaoProduto {
  id: string; slug: string; nome: string; tipo: TipoProduto;
  precoCentavos: number; promocionalCentavos: number | null; aPartirDe: boolean;
  imagemUrl: string | null; imagemAlt: string; esgotado: boolean;
  cores: { slug: string; nome: string; hex: string | null }[];
}

const incluirCartao = {
  imagens: { orderBy: { ordem: "asc" as const }, take: 1, select: { url: true, alt: true } },
  variacoes: { where: { ativa: true }, select: { precoCentavos: true, precoPromocionalCentavos: true, estoque: true, prazoPreparoDias: true, disponivel: true, ativa: true, cor: { select: { slug: true, nome: true, hex: true, ativa: true } } } },
} satisfies Prisma.ProdutoInclude;

type ProdutoCartao = Prisma.ProdutoGetPayload<{ include: typeof incluirCartao }>;

export function paraCartao(p: ProdutoCartao): CartaoProduto {
  const compraveis = p.variacoes.filter((v) => variacaoCompravel(p.tipo, v));
  const base = compraveis.length ? compraveis : p.variacoes;
  const precos = base.map((v) => precoDaVariacao(p, v));
  const menor = precos.reduce((a, b) => (b.finalCentavos < a.finalCentavos ? b : a), precos[0] ?? precoDaVariacao(p, { precoCentavos: null, precoPromocionalCentavos: null, estoque: 0, prazoPreparoDias: null, disponivel: true, ativa: true }));
  const cores = new Map<string, { slug: string; nome: string; hex: string | null }>();
  for (const v of base) if (v.cor) cores.set(v.cor.slug, { slug: v.cor.slug, nome: v.cor.nome, hex: v.cor.hex });
  return {
    id: p.id, slug: p.slug, nome: p.nome, tipo: p.tipo,
    precoCentavos: menor.precoCentavos, promocionalCentavos: menor.promocionalCentavos,
    aPartirDe: new Set(precos.map((x) => x.finalCentavos)).size > 1,
    imagemUrl: p.imagens[0]?.url ?? null, imagemAlt: p.imagens[0]?.alt ?? p.nome,
    esgotado: compraveis.length === 0,
    cores: [...cores.values()],
  };
}

export type Ordem = "novidades" | "menor" | "maior";
export interface FiltrosCatalogo {
  categoriaSlug?: string; busca?: string; cores?: string[]; tipo?: TipoProduto; promocao?: boolean;
  ordem?: Ordem; pagina?: number; somenteDisponiveis?: boolean;
}

export async function categoriaPorSlug(slug: string) {
  return db.categoria.findFirst({
    where: { slug, ativa: true, OR: [{ paiId: null }, { pai: { ativa: true } }] },
    include: { pai: { select: { slug: true, nome: true } }, filhas: { where: { ativa: true }, orderBy: [{ ordem: "asc" }, { nome: "asc" }], select: { slug: true, nome: true } } },
  });
}

export async function listarCategoriasPublicas() {
  return db.categoria.findMany({
    where: { ativa: true, paiId: null },
    orderBy: [{ ordem: "asc" }, { nome: "asc" }],
    select: { id: true, slug: true, nome: true, imagemUrl: true, filhas: { where: { ativa: true }, orderBy: [{ ordem: "asc" }, { nome: "asc" }], select: { slug: true, nome: true } } },
  });
}

/** Cores que existem em produtos publicados (para o filtro). */
export async function coresDeProdutosPublicados() {
  return db.cor.findMany({
    where: { ativa: true, variacoes: { some: { ativa: true, produto: visivel } } },
    orderBy: { nome: "asc" }, select: { slug: true, nome: true, hex: true },
  });
}

export async function listarProdutosPublicos(f: FiltrosCatalogo = {}) {
  const and: Prisma.ProdutoWhereInput[] = [visivel];
  if (f.categoriaSlug) {
    const cat = await db.categoria.findUnique({ where: { slug: f.categoriaSlug }, select: { id: true, filhas: { select: { id: true } } } });
    if (!cat) return { itens: [] as CartaoProduto[], total: 0, pagina: 1, paginas: 1 };
    and.push({ categoriaId: { in: [cat.id, ...cat.filhas.map((x) => x.id)] } });
  }
  const palavras = normalizarBusca(f.busca).split(" ").filter(Boolean).slice(0, 6);
  // Busca preenchida só com símbolos (ex.: "%_") não pode virar "mostrar tudo".
  if (f.busca?.trim() && !palavras.length) return { itens: [] as CartaoProduto[], total: 0, pagina: 1, paginas: 1 };
  for (const palavra of palavras) and.push({ indiceBusca: { contains: ` ${palavra}` } });
  if (f.cores?.length) and.push({ variacoes: { some: { ativa: true, cor: { slug: { in: f.cores } } } } });
  if (f.tipo) and.push({ tipo: f.tipo });
  if (f.promocao) and.push({ OR: [{ precoPromocionalCentavos: { not: null } }, { variacoes: { some: { ativa: true, precoPromocionalCentavos: { not: null } } } }] });
  if (f.somenteDisponiveis) and.push({ variacoes: { some: { ativa: true, disponivel: true, OR: [{ estoque: { gt: 0 } }, { produto: { tipo: "SOB_ENCOMENDA" } }] } } });
  const where: Prisma.ProdutoWhereInput = { AND: and };

  // Ordenação por preço considera o preço efetivo (promoção e variações): calculado em memória sobre o conjunto filtrado.
  const leve = await db.produto.findMany({ where, select: { id: true, criadoEm: true, tipo: true, precoCentavos: true, precoPromocionalCentavos: true, prazoPreparoDias: true, variacoes: { where: { ativa: true }, select: { precoCentavos: true, precoPromocionalCentavos: true, estoque: true, prazoPreparoDias: true, disponivel: true, ativa: true } } } });
  const chave = (p: (typeof leve)[number]) => {
    const vs = p.variacoes.filter((v) => variacaoCompravel(p.tipo, v));
    const pool = vs.length ? vs : p.variacoes;
    return Math.min(...pool.map((v) => precoDaVariacao(p, v).finalCentavos));
  };
  const ordem = f.ordem ?? "novidades";
  leve.sort((a, b) => (ordem === "menor" ? chave(a) - chave(b) : ordem === "maior" ? chave(b) - chave(a) : b.criadoEm.getTime() - a.criadoEm.getTime()) || a.id.localeCompare(b.id));

  const total = leve.length;
  const paginas = Math.max(1, Math.ceil(total / POR_PAGINA));
  const pagina = Math.min(Math.max(1, f.pagina ?? 1), paginas);
  const ids = leve.slice((pagina - 1) * POR_PAGINA, pagina * POR_PAGINA).map((p) => p.id);
  const completos = await db.produto.findMany({ where: { id: { in: ids } }, include: incluirCartao });
  const porId = new Map(completos.map((p) => [p.id, p]));
  return { itens: ids.map((id) => paraCartao(porId.get(id)!)), total, pagina, paginas };
}

async function cartoes(where: Prisma.ProdutoWhereInput, take: number, orderBy: Prisma.ProdutoOrderByWithRelationInput) {
  const ps = await db.produto.findMany({ where: { AND: [visivel, where] }, orderBy, take, include: incluirCartao });
  return ps.map(paraCartao);
}
export const novidades = (n = 10) => cartoes({}, n, { criadoEm: "desc" });
export const destaques = (n = 10) => cartoes({ destaque: true }, n, { atualizadoEm: "desc" });

/** Mais vendidos: soma de unidades de pedidos com pagamento aprovado em diante. Vazio enquanto não houver vendas. */
export async function maisVendidos(n = 10) {
  const linhas = await db.$queryRaw<{ produtoId: string; total: bigint }[]>`
    SELECT v."produtoId", SUM(i."quantidade")::bigint AS total
    FROM "ItemPedido" i
    JOIN "Pedido" o ON o."id" = i."pedidoId"
    JOIN "Variacao" v ON v."id" = i."variacaoId"
    WHERE o."status" IN ('PAGAMENTO_APROVADO','EM_PREPARACAO','PRONTO_PARA_ENVIO','ENVIADO','ENTREGUE')
    GROUP BY v."produtoId" ORDER BY total DESC LIMIT ${n * 2}`;
  if (!linhas.length) return [];
  const ps = await db.produto.findMany({ where: { AND: [visivel, { id: { in: linhas.map((l) => l.produtoId) } }] }, include: incluirCartao });
  const ordem = new Map(linhas.map((l, i) => [l.produtoId, i]));
  return ps.sort((a, b) => ordem.get(a.id)! - ordem.get(b.id)!).slice(0, n).map(paraCartao);
}

export async function produtosPorSlugs(slugs: string[]) {
  if (!slugs.length) return [];
  const ps = await db.produto.findMany({ where: { AND: [visivel, { slug: { in: slugs.slice(0, 60) } }] }, include: incluirCartao });
  return ps.map(paraCartao);
}

export async function relacionados(produtoId: string, categoriaId: string, n = 4) {
  return cartoes({ id: { not: produtoId }, categoriaId }, n, { atualizadoEm: "desc" });
}

// ───────────── página de produto ─────────────

export async function obterProdutoPublico(slug: string) {
  const p = await db.produto.findFirst({
    where: { AND: [visivel, { slug }] },
    include: {
      categoria: { select: { id: true, slug: true, nome: true, pai: { select: { slug: true, nome: true } } } },
      imagens: { orderBy: { ordem: "asc" } },
      opcoesPersonalizacao: { orderBy: { ordem: "asc" } },
      variacoes: { where: { ativa: true }, orderBy: [{ criadoEm: "asc" }, { sku: "asc" }], include: { cor: { select: { slug: true, nome: true, hex: true } } } },
    },
  });
  if (!p) return null;
  const variacoes = p.variacoes.map((v) => {
    const preco = precoDaVariacao(p, v);
    return {
      id: v.id, sku: v.sku, tamanho: v.tamanho, cor: v.cor,
      ...preco, compravel: variacaoCompravel(p.tipo, v), quantidadeMaxima: quantidadeMaxima(p.tipo, v),
      prazoDias: prazoDaVariacao(p, v), poucasUnidades: p.tipo === "PRONTA_ENTREGA" && v.estoque > 0 && v.estoque <= 3 ? v.estoque : null,
    };
  });
  return { ...p, variacoes };
}
export type ProdutoPublico = NonNullable<Awaited<ReturnType<typeof obterProdutoPublico>>>;
