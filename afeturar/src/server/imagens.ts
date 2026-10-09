import { db } from "@/lib/db";
import { registrarAuditoria } from "./auditoria";
import { apagarImagem, salvarImagem } from "./armazenamento";
import { ErroNegocio } from "./categorias";

export const MAX_IMAGENS_POR_PRODUTO = 10;

export async function adicionarImagem(produtoId: string, arquivo: Buffer, alt: string, variacaoId: string | null, autorId: string) {
  const produto = await db.produto.findUnique({ where: { id: produtoId }, include: { imagens: true, variacoes: { select: { id: true } } } });
  if (!produto) throw new ErroNegocio("Produto não encontrado.");
  if (produto.imagens.length >= MAX_IMAGENS_POR_PRODUTO) throw new ErroNegocio(`Limite de ${MAX_IMAGENS_POR_PRODUTO} fotos por produto.`);
  if (variacaoId && !produto.variacoes.some((v) => v.id === variacaoId)) throw new ErroNegocio("Variação inválida.");
  const textoAlt = alt.trim().slice(0, 160) || produto.nome; // texto alternativo (acessibilidade)
  const { url } = await salvarImagem(arquivo);
  const ordem = produto.imagens.reduce((m, i) => Math.max(m, i.ordem), -1) + 1;
  const img = await db.produtoImagem.create({ data: { produtoId, url, alt: textoAlt, ordem, variacaoId } });
  await registrarAuditoria(autorId, "adicionar-foto", "Produto", produtoId);
  return img;
}

export async function removerImagem(imagemId: string, autorId: string) {
  const img = await db.produtoImagem.findUnique({ where: { id: imagemId }, include: { produto: { select: { ativo: true, imagens: { select: { id: true } } } } } });
  if (!img) throw new ErroNegocio("Foto não encontrada.");
  if (img.produto.ativo && img.produto.imagens.length <= 1) throw new ErroNegocio("Produto publicado precisa de ao menos uma foto. Despublique antes de remover a última.");
  await db.produtoImagem.delete({ where: { id: imagemId } });
  await apagarImagem(img.url);
  await registrarAuditoria(autorId, "remover-foto", "Produto", img.produtoId);
}

/** Troca a posição da foto com a vizinha (-1 sobe, +1 desce). A primeira é a foto principal. */
export async function moverImagem(imagemId: string, direcao: -1 | 1) {
  const img = await db.produtoImagem.findUnique({ where: { id: imagemId } });
  if (!img) throw new ErroNegocio("Foto não encontrada.");
  const todas = await db.produtoImagem.findMany({ where: { produtoId: img.produtoId }, orderBy: { ordem: "asc" } });
  const i = todas.findIndex((x) => x.id === imagemId);
  const j = i + direcao;
  if (j < 0 || j >= todas.length) return;
  const ordenadas = [...todas];
  [ordenadas[i], ordenadas[j]] = [ordenadas[j], ordenadas[i]];
  await db.$transaction(ordenadas.map((x, ordem) => db.produtoImagem.update({ where: { id: x.id }, data: { ordem } })));
}
