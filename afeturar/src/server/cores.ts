import { db } from "@/lib/db";
import { slugify } from "@/lib/slug";
import { registrarAuditoria } from "./auditoria";
import { reindexarTodos } from "./busca";
import { ErroNegocio } from "./categorias";
import { corSchema, type CorInput } from "./validacao";

export const listarCores = () => db.cor.findMany({ orderBy: { nome: "asc" }, include: { _count: { select: { variacoes: true } } } });

export async function criarCor(entrada: CorInput, autorId: string) {
  const dados = corSchema.parse(entrada);
  const slug = slugify(dados.nome);
  if (await db.cor.findUnique({ where: { slug } })) throw new ErroNegocio("Já existe uma cor com esse nome.");
  const cor = await db.cor.create({ data: { ...dados, slug } });
  await registrarAuditoria(autorId, "criar", "Cor", cor.id, { nome: cor.nome });
  return cor;
}

export async function atualizarCor(id: string, entrada: CorInput, autorId: string) {
  const dados = corSchema.parse(entrada);
  const cor = await db.cor.update({ where: { id }, data: dados });
  await reindexarTodos();
  await registrarAuditoria(autorId, "atualizar", "Cor", id, { nome: cor.nome });
  return cor;
}

export async function excluirCor(id: string, autorId: string) {
  const emUso = await db.variacao.count({ where: { corId: id } });
  if (emUso > 0) throw new ErroNegocio(`Esta cor é usada em ${emUso} variação(ões). Desative-a em vez de excluir.`);
  await db.cor.delete({ where: { id } });
  await registrarAuditoria(autorId, "excluir", "Cor", id);
}
