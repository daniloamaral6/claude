import { readFile } from "node:fs/promises";
import path from "node:path";
import { db } from "@/lib/db";
import { adicionarImagem } from "./imagens";
import { criarCor } from "./cores";
import { criarProduto, obterProduto } from "./produtos";
import { normalizar, type Referencias, type ResultadoImportacao } from "./importacao";

export async function carregarReferencias(): Promise<Referencias> {
  const [categorias, cores] = await Promise.all([
    db.categoria.findMany({ select: { id: true, nome: true } }),
    db.cor.findMany({ select: { id: true, nome: true } }),
  ]);
  return { categorias, cores };
}

export interface RelatorioAplicacao {
  criados: { nome: string; id: string }[];
  jaExistiam: string[];
  coresCriadas: string[];
  fotosAdicionadas: number;
  avisos: string[];
}

/** Cria os produtos como RASCUNHO (nunca publica). Idempotente: produto com o mesmo nome é ignorado. */
export async function aplicarImportacao(res: ResultadoImportacao, autorId: string, pastaFotos?: string): Promise<RelatorioAplicacao> {
  const rel: RelatorioAplicacao = { criados: [], jaExistiam: [], coresCriadas: [], fotosAdicionadas: 0, avisos: [] };
  if (res.erros.length) throw new Error("Há erros na planilha; corrija antes de aplicar.");

  const idsCorNova = new Map<string, string>();
  for (const nome of new Set(res.produtos.flatMap((p) => p.coresNovas))) {
    const existente = (await db.cor.findMany({ select: { id: true, nome: true } })).find((c) => normalizar(c.nome) === normalizar(nome));
    const cor = existente ?? (await criarCor({ nome, hex: null, ativa: true }, autorId));
    if (!existente) rel.coresCriadas.push(nome);
    idsCorNova.set(nome, cor.id);
  }

  for (const p of res.produtos) {
    const nomes = (await db.produto.findMany({ select: { nome: true } })).map((x) => normalizar(x.nome));
    if (nomes.includes(normalizar(p.entrada.nome))) { rel.jaExistiam.push(p.entrada.nome); continue; }
    const entrada = {
      ...p.entrada,
      variacoes: p.entrada.variacoes.map((v) => ({ ...v, corId: v.corId?.startsWith("nova:") ? idsCorNova.get(v.corId.slice(5)) ?? null : v.corId })),
    };
    const produto = await criarProduto(entrada, autorId);
    rel.criados.push({ nome: produto.nome, id: produto.id });

    if (p.fotos.length && pastaFotos) {
      const completo = await obterProduto(produto.id);
      const multi = (completo?.variacoes.length ?? 0) > 1;
      for (const f of p.fotos) {
        const arquivo = path.join(pastaFotos, path.basename(f.arquivo)); // basename: nunca sai da pasta
        try {
          const buf = await readFile(arquivo);
          const variacao = multi ? completo?.variacoes.find((v) => v.sku === f.sku)?.id ?? null : null;
          await adicionarImagem(produto.id, buf, "", variacao, autorId);
          rel.fotosAdicionadas++;
        } catch (e) {
          rel.avisos.push(`${produto.nome}: foto "${f.arquivo}" não adicionada (${e instanceof Error ? e.message : "erro"}).`);
        }
      }
    }
  }
  return rel;
}
