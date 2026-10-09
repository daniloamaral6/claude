import { db } from "@/lib/db";

/** Minúsculas, sem acentos e só letras/números separados por espaço (também neutraliza curingas como % e _). */
export const normalizarBusca = (s: unknown) =>
  String(s ?? "")
    .normalize("NFD")
    .replace(/\p{M}+/gu, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, " ")
    .trim();

/** Recalcula o índice de busca de um produto (nome, descrição, características, material, categoria e cores). */
export async function indexarProduto(id: string) {
  const p = await db.produto.findUnique({
    where: { id },
    select: { nome: true, descricao: true, caracteristicas: true, material: true, categoria: { select: { nome: true, pai: { select: { nome: true } } } }, variacoes: { select: { tamanho: true, cor: { select: { nome: true } } } } },
  });
  if (!p) return;
  const texto = [p.nome, p.descricao, p.caracteristicas.join(" "), p.material, p.categoria.nome, p.categoria.pai?.nome, ...p.variacoes.flatMap((v) => [v.cor?.nome, v.tamanho])].filter(Boolean).join(" ");
  // Espaço no início: a busca casa só no COMEÇO das palavras (" oracao" não acha "decoracao").
  await db.produto.update({ where: { id }, data: { indiceBusca: ` ${normalizarBusca(texto)}` } });
}

/** Chamar quando uma categoria ou cor é renomeada. */
export async function reindexarTodos() {
  for (const { id } of await db.produto.findMany({ select: { id: true } })) await indexarProduto(id);
}
