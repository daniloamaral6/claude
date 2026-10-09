import { Prisma } from "@/generated/prisma/client";
import { db } from "@/lib/db";
import { registrarAuditoria } from "./auditoria";
import { indexarProduto } from "./busca";
import { ErroNegocio, slugLivre } from "./categorias";
import { produtoSchema, type ProdutoInput } from "./validacao";

const POR_PAGINA = 20;

/** Remove o campo `id` (ausente em itens novos) antes de criar registros. */
const semId = <T extends { id?: string }>(o: T): Omit<T, "id"> => {
  const copia = { ...o };
  delete copia.id;
  return copia;
};

export async function listarProdutos(f: { busca?: string; categoriaId?: string; status?: "ativo" | "rascunho"; pagina?: number } = {}) {
  const where: Prisma.ProdutoWhereInput = {
    ...(f.busca ? { OR: [{ nome: { contains: f.busca, mode: "insensitive" } }, { variacoes: { some: { sku: { contains: f.busca, mode: "insensitive" } } } }] } : {}),
    ...(f.categoriaId ? { categoriaId: f.categoriaId } : {}),
    ...(f.status ? { ativo: f.status === "ativo" } : {}),
  };
  const pagina = Math.max(1, f.pagina ?? 1);
  const [itens, total] = await Promise.all([
    db.produto.findMany({
      where, orderBy: { atualizadoEm: "desc" }, skip: (pagina - 1) * POR_PAGINA, take: POR_PAGINA,
      include: { categoria: { select: { nome: true } }, variacoes: { select: { estoque: true, ativa: true } }, imagens: { take: 1, orderBy: { ordem: "asc" } } },
    }),
    db.produto.count({ where }),
  ]);
  return { itens, total, pagina, paginas: Math.max(1, Math.ceil(total / POR_PAGINA)) };
}

export const obterProduto = (id: string) =>
  db.produto.findUnique({
    where: { id },
    include: { variacoes: { orderBy: [{ criadoEm: "asc" }, { sku: "asc" }] }, imagens: { orderBy: { ordem: "asc" } }, opcoesPersonalizacao: { orderBy: { ordem: "asc" } } },
  });

async function conferirReferencias(dados: ProdutoInput) {
  if (!(await db.categoria.findUnique({ where: { id: dados.categoriaId } }))) throw new ErroNegocio("Categoria não encontrada.");
  const corIds = [...new Set(dados.variacoes.map((v) => v.corId).filter((c): c is string => !!c))];
  if (corIds.length && (await db.cor.count({ where: { id: { in: corIds } } })) !== corIds.length) throw new ErroNegocio("Uma das cores escolhidas não existe.");
}

/** SKUs são únicos na loja inteira: avisa qual SKU já está em uso por outro produto. */
async function conferirSkus(dados: ProdutoInput, produtoId?: string) {
  const skus = dados.variacoes.map((v) => v.sku);
  if (!skus.length) return;
  const emUso = await db.variacao.findMany({ where: { sku: { in: skus }, ...(produtoId ? { produtoId: { not: produtoId } } : {}) }, select: { sku: true } });
  if (emUso.length) throw new ErroNegocio(`SKU já usado em outro produto: ${emUso.map((e) => e.sku).join(", ")}.`);
}

export async function criarProduto(entrada: unknown, autorId: string) {
  const dados = produtoSchema.parse(entrada);
  if (dados.ativo) throw new ErroNegocio("Salve primeiro como rascunho, adicione as fotos e então publique.");
  await conferirReferencias(dados);
  await conferirSkus(dados);
  const { variacoes, opcoesPersonalizacao, ...base } = dados;
  const produto = await db.produto.create({
    data: {
      ...base,
      slug: await slugLivre(dados.nome, "produto"),
      variacoes: { create: variacoes.map(semId) },
      opcoesPersonalizacao: { create: opcoesPersonalizacao.map((o, ordem) => ({ ...semId(o), ordem })) },
    },
  });
  await indexarProduto(produto.id);
  await registrarAuditoria(autorId, "criar", "Produto", produto.id, { nome: produto.nome });
  return produto;
}

export async function atualizarProduto(id: string, entrada: unknown, autorId: string) {
  const dados = produtoSchema.parse(entrada);
  const atual = await obterProduto(id);
  if (!atual) throw new ErroNegocio("Produto não encontrado.");
  if (dados.ativo && atual.imagens.length === 0) throw new ErroNegocio("Adicione ao menos uma foto antes de publicar o produto.");
  const { variacoes, opcoesPersonalizacao, ...base } = dados;
  const idsRecebidos = new Set(variacoes.map((v) => v.id).filter(Boolean));
  for (const v of variacoes) if (v.id && !atual.variacoes.some((a) => a.id === v.id)) throw new ErroNegocio("Variação inválida para este produto.");
  await conferirReferencias(dados);
  await conferirSkus(dados, id);

  await db.$transaction(async (tx) => {
    await tx.produto.update({ where: { id }, data: { ...base, slug: atual.slug } });

    // Variações removidas do formulário: apaga se nunca foi vendida; senão apenas desativa (preserva histórico).
    for (const antiga of atual.variacoes.filter((a) => !idsRecebidos.has(a.id))) {
      const vendida = await tx.itemPedido.count({ where: { variacaoId: antiga.id } });
      if (vendida > 0) await tx.variacao.update({ where: { id: antiga.id }, data: { ativa: false, disponivel: false } });
      else await tx.variacao.delete({ where: { id: antiga.id } });
    }
    // Libera combinações/SKUs antes de reaproveitar (evita conflito de ordem entre linhas).
    for (const v of variacoes) {
      const { id: vid, ...resto } = v;
      if (vid) await tx.variacao.update({ where: { id: vid }, data: resto });
    }
    for (const v of variacoes.filter((x) => !x.id)) {
      await tx.variacao.create({ data: { ...semId(v), produtoId: id } });
    }

    const opcoesRecebidas = new Set(opcoesPersonalizacao.map((o) => o.id).filter(Boolean));
    await tx.opcaoPersonalizacao.deleteMany({ where: { produtoId: id, id: { notIn: [...opcoesRecebidas] as string[] } } });
    for (const [ordem, o] of opcoesPersonalizacao.entries()) {
      const { id: oid, ...resto } = o;
      if (oid) await tx.opcaoPersonalizacao.update({ where: { id: oid }, data: { ...resto, ordem } });
      else await tx.opcaoPersonalizacao.create({ data: { ...resto, ordem, produtoId: id } });
    }
  });
  await indexarProduto(id);
  await registrarAuditoria(autorId, "atualizar", "Produto", id, { nome: dados.nome, ativo: dados.ativo });
  return obterProduto(id);
}

/** Exclui se nunca foi vendido; caso contrário, apenas despublica (os pedidos antigos continuam intactos). */
export async function removerProduto(id: string, autorId: string) {
  const vendas = await db.itemPedido.count({ where: { variacao: { produtoId: id } } });
  if (vendas > 0) {
    await db.produto.update({ where: { id }, data: { ativo: false } });
    await registrarAuditoria(autorId, "despublicar", "Produto", id, { motivo: "tem pedidos" });
    return { excluido: false as const };
  }
  await db.produto.delete({ where: { id } });
  await registrarAuditoria(autorId, "excluir", "Produto", id);
  return { excluido: true as const };
}
