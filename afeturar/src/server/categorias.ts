import { db } from "@/lib/db";
import { slugify } from "@/lib/slug";
import { registrarAuditoria } from "./auditoria";
import { categoriaSchema, type CategoriaInput } from "./validacao";

export class ErroNegocio extends Error {}

async function slugLivre(base: string, tabela: "categoria" | "produto", ignorarId?: string) {
  const raiz = slugify(base) || "item";
  for (let i = 0; i < 50; i++) {
    const slug = i === 0 ? raiz : `${raiz}-${i + 1}`;
    const existe = await (db[tabela] as unknown as { findUnique: (a: object) => Promise<{ id: string } | null> }).findUnique({ where: { slug } });
    if (!existe || existe.id === ignorarId) return slug;
  }
  throw new ErroNegocio("Não foi possível gerar um endereço (slug) único.");
}
export { slugLivre };

async function validarPai(paiId: string | null, selfId?: string) {
  if (!paiId) return;
  if (paiId === selfId) throw new ErroNegocio("Uma categoria não pode ser subcategoria de si mesma.");
  const pai = await db.categoria.findUnique({ where: { id: paiId } });
  if (!pai) throw new ErroNegocio("Categoria principal não encontrada.");
  if (pai.paiId) throw new ErroNegocio("Subcategorias só podem ter um nível.");
  if (selfId && (await db.categoria.count({ where: { paiId: selfId } })) > 0)
    throw new ErroNegocio("Esta categoria já tem subcategorias; não pode virar subcategoria.");
}

export function listarCategorias() {
  return db.categoria.findMany({ orderBy: [{ ordem: "asc" }, { nome: "asc" }], include: { _count: { select: { produtos: true, filhas: true } }, pai: { select: { nome: true } } } });
}

export async function criarCategoria(entrada: CategoriaInput, autorId: string) {
  const dados = categoriaSchema.parse(entrada);
  await validarPai(dados.paiId);
  const cat = await db.categoria.create({ data: { ...dados, slug: await slugLivre(dados.nome, "categoria") } });
  await registrarAuditoria(autorId, "criar", "Categoria", cat.id, { nome: cat.nome });
  return cat;
}

export async function atualizarCategoria(id: string, entrada: CategoriaInput, autorId: string) {
  const dados = categoriaSchema.parse(entrada);
  await validarPai(dados.paiId, id);
  const cat = await db.categoria.update({ where: { id }, data: dados });
  await registrarAuditoria(autorId, "atualizar", "Categoria", id, { nome: cat.nome });
  return cat;
}

export async function excluirCategoria(id: string, autorId: string) {
  const cat = await db.categoria.findUnique({ where: { id }, include: { _count: { select: { produtos: true, filhas: true } } } });
  if (!cat) throw new ErroNegocio("Categoria não encontrada.");
  if (cat._count.produtos > 0) throw new ErroNegocio("Há produtos nesta categoria. Mova-os ou desative a categoria.");
  if (cat._count.filhas > 0) throw new ErroNegocio("Esta categoria tem subcategorias. Remova-as primeiro.");
  await db.categoria.delete({ where: { id } });
  await registrarAuditoria(autorId, "excluir", "Categoria", id, { nome: cat.nome });
}
