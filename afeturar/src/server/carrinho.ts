import { createHash, randomBytes } from "node:crypto";
import { db } from "@/lib/db";
import { LIMITE_QUANTIDADE, precoDaVariacao, prazoDaVariacao, quantidadeMaxima, variacaoCompravel, type TipoProduto } from "@/lib/preco";
import { ErroNegocio } from "./categorias";

/**
 * Carrinho de visitante, persistido no banco. O cookie guarda um token aleatório; no banco fica só o hash.
 * Preços e disponibilidade são SEMPRE lidos do banco: nada que vem do navegador define valores.
 */

export const DURACAO_CARRINHO_MS = 30 * 24 * 60 * 60 * 1000;
export const MAX_LINHAS = 30;

const hash = (token: string) => createHash("sha256").update(token).digest("hex");
const tokenValido = (t?: string | null): t is string => !!t && t.length >= 20 && t.length <= 100;

async function carrinhoDoToken(token?: string | null) {
  if (!tokenValido(token)) return null;
  const c = await db.carrinho.findUnique({ where: { tokenVisitante: hash(token) } });
  if (!c) return null;
  if (c.expiraEm && c.expiraEm <= new Date()) { await db.carrinho.delete({ where: { id: c.id } }); return null; }
  return c;
}

async function criarCarrinho() {
  const token = randomBytes(32).toString("base64url");
  const c = await db.carrinho.create({ data: { tokenVisitante: hash(token), expiraEm: new Date(Date.now() + DURACAO_CARRINHO_MS) } });
  return { token, carrinho: c };
}

export type Personalizacao = Record<string, string>;

/** Valida e normaliza os textos de personalização contra os campos cadastrados no produto. */
export function validarPersonalizacao(opcoes: { id: string; rotulo: string; obrigatoria: boolean; maxCaracteres: number }[], entrada: unknown): Personalizacao {
  const bruto = entrada && typeof entrada === "object" ? (entrada as Record<string, unknown>) : {};
  const saida: Personalizacao = {};
  for (const o of opcoes) {
    const texto = String(bruto[o.id] ?? "").replace(/[\u0000-\u001f\u007f]+/g, " ").replace(/\s+/g, " ").trim();
    if (!texto) {
      if (o.obrigatoria) throw new ErroNegocio(`Preencha o campo "${o.rotulo}".`);
      continue;
    }
    if (texto.length > o.maxCaracteres) throw new ErroNegocio(`"${o.rotulo}" aceita até ${o.maxCaracteres} caracteres.`);
    saida[o.id] = texto;
  }
  return saida;
}
const chaveDe = (p: Personalizacao) => Object.keys(p).sort().map((k) => `${k}=${p[k]}`).join("|");

const incluirVariacao = {
  produto: { include: { opcoesPersonalizacao: { orderBy: { ordem: "asc" as const } }, imagens: { orderBy: { ordem: "asc" as const }, take: 1 }, categoria: { select: { ativa: true } } } },
  cor: { select: { nome: true, hex: true } },
};

async function variacaoVendavel(variacaoId: string) {
  const v = await db.variacao.findUnique({ where: { id: variacaoId }, include: incluirVariacao });
  if (!v || !v.ativa || !v.produto.ativo || !v.produto.categoria.ativa) throw new ErroNegocio("Este produto não está mais disponível.");
  return v;
}

export async function adicionarItem(token: string | null | undefined, entrada: { variacaoId: string; quantidade: number; personalizacao?: unknown }) {
  const qtd = Math.trunc(Number(entrada.quantidade));
  if (!Number.isFinite(qtd) || qtd < 1) throw new ErroNegocio("Quantidade inválida.");
  const v = await variacaoVendavel(String(entrada.variacaoId));
  if (!variacaoCompravel(v.produto.tipo, v)) throw new ErroNegocio("Esta opção está indisponível no momento.");
  const personalizacao = validarPersonalizacao(v.produto.opcoesPersonalizacao, v.produto.personalizavel ? entrada.personalizacao : {});
  const chave = chaveDe(personalizacao);
  const max = quantidadeMaxima(v.produto.tipo, v);

  let atual = await carrinhoDoToken(token);
  let novoToken: string | null = null;
  if (!atual) { const n = await criarCarrinho(); atual = n.carrinho; novoToken = n.token; }

  const existente = await db.itemCarrinho.findFirst({ where: { carrinhoId: atual.id, variacaoId: v.id, chave } });
  const total = (existente?.quantidade ?? 0) + qtd;
  if (total > max) {
    throw new ErroNegocio(max < LIMITE_QUANTIDADE ? `Só temos ${max} ${max === 1 ? "unidade" : "unidades"} desta opção${existente ? ` (você já tem ${existente.quantidade} no carrinho)` : ""}.` : `O limite é de ${LIMITE_QUANTIDADE} unidades por item.`);
  }
  if (!existente && (await db.itemCarrinho.count({ where: { carrinhoId: atual.id } })) >= MAX_LINHAS) throw new ErroNegocio(`O carrinho aceita até ${MAX_LINHAS} itens diferentes.`);

  if (existente) await db.itemCarrinho.update({ where: { id: existente.id }, data: { quantidade: total } });
  else await db.itemCarrinho.create({ data: { carrinhoId: atual.id, variacaoId: v.id, quantidade: qtd, personalizacao: Object.keys(personalizacao).length ? personalizacao : undefined, chave } });
  await db.carrinho.update({ where: { id: atual.id }, data: { expiraEm: new Date(Date.now() + DURACAO_CARRINHO_MS) } });
  return { token: novoToken }; // só vem preenchido quando um carrinho novo foi criado (o chamador grava o cookie)
}

async function itemDoCarrinho(token: string | null | undefined, itemId: string) {
  const c = await carrinhoDoToken(token);
  if (!c) throw new ErroNegocio("Seu carrinho expirou. Adicione os itens novamente.");
  const item = await db.itemCarrinho.findFirst({ where: { id: itemId, carrinhoId: c.id }, include: { variacao: { include: incluirVariacao } } });
  if (!item) throw new ErroNegocio("Item não encontrado no carrinho.");
  return item;
}

export async function alterarQuantidade(token: string | null | undefined, itemId: string, quantidade: number) {
  const item = await itemDoCarrinho(token, itemId);
  const qtd = Math.trunc(Number(quantidade));
  if (!Number.isFinite(qtd) || qtd < 1) throw new ErroNegocio("Quantidade inválida.");
  const max = quantidadeMaxima(item.variacao.produto.tipo, item.variacao);
  if (!variacaoCompravel(item.variacao.produto.tipo, item.variacao) || !item.variacao.produto.ativo) throw new ErroNegocio("Este item não está mais disponível. Remova-o do carrinho.");
  if (qtd > max) throw new ErroNegocio(max < LIMITE_QUANTIDADE ? `Só temos ${max} ${max === 1 ? "unidade" : "unidades"} desta opção.` : `O limite é de ${LIMITE_QUANTIDADE} unidades por item.`);
  await db.itemCarrinho.update({ where: { id: item.id }, data: { quantidade: qtd } });
}

export async function removerItem(token: string | null | undefined, itemId: string) {
  const item = await itemDoCarrinho(token, itemId);
  await db.itemCarrinho.delete({ where: { id: item.id } });
}

export async function contarItens(token: string | null | undefined) {
  const c = await carrinhoDoToken(token);
  if (!c) return 0;
  return (await db.itemCarrinho.aggregate({ where: { carrinhoId: c.id }, _sum: { quantidade: true } }))._sum.quantidade ?? 0;
}

export interface LinhaCarrinho {
  itemId: string; quantidade: number; quantidadeMaxima: number;
  produto: { nome: string; slug: string; tipo: TipoProduto; imagemUrl: string | null; imagemAlt: string };
  variacao: { sku: string; cor: string | null; tamanho: string | null };
  precoUnitarioCentavos: number; precoOriginalCentavos: number | null; subtotalCentavos: number;
  personalizacao: { rotulo: string; texto: string }[];
  prazoDias: number;
  /** null = ok. Linhas com problema ficam fora do total e bloqueiam a compra até serem ajustadas. */
  problema: string | null;
}
export interface Carrinho { linhas: LinhaCarrinho[]; subtotalCentavos: number; quantidadeTotal: number; temProblemas: boolean; prazoPreparoDias: number; temSobEncomenda: boolean }

/** Lê o carrinho com preços e disponibilidade ATUAIS. Não altera nada no banco. */
export async function lerCarrinho(token: string | null | undefined): Promise<Carrinho> {
  const vazio: Carrinho = { linhas: [], subtotalCentavos: 0, quantidadeTotal: 0, temProblemas: false, prazoPreparoDias: 0, temSobEncomenda: false };
  const c = await carrinhoDoToken(token);
  if (!c) return vazio;
  const itens = await db.itemCarrinho.findMany({ where: { carrinhoId: c.id }, orderBy: [{ id: "asc" }], include: { variacao: { include: incluirVariacao } } });
  const linhas: LinhaCarrinho[] = itens.map((i) => {
    const v = i.variacao, p = v.produto;
    const preco = precoDaVariacao(p, v);
    const max = quantidadeMaxima(p.tipo, v);
    const vendavel = p.ativo && p.categoria.ativa && variacaoCompravel(p.tipo, v);
    const problema = !vendavel ? "Indisponível no momento" : i.quantidade > max ? `Só temos ${max} ${max === 1 ? "unidade" : "unidades"}` : null;
    const pers = (i.personalizacao ?? {}) as Personalizacao;
    return {
      itemId: i.id, quantidade: i.quantidade, quantidadeMaxima: vendavel ? max : 0,
      produto: { nome: p.nome, slug: p.slug, tipo: p.tipo, imagemUrl: p.imagens[0]?.url ?? null, imagemAlt: p.imagens[0]?.alt ?? p.nome },
      variacao: { sku: v.sku, cor: v.cor?.nome ?? null, tamanho: v.tamanho },
      precoUnitarioCentavos: preco.finalCentavos, precoOriginalCentavos: preco.promocionalCentavos ? preco.precoCentavos : null,
      subtotalCentavos: problema ? 0 : preco.finalCentavos * i.quantidade,
      personalizacao: p.opcoesPersonalizacao.filter((o) => pers[o.id]).map((o) => ({ rotulo: o.rotulo, texto: pers[o.id] })),
      prazoDias: prazoDaVariacao(p, v), problema,
    };
  });
  const ok = linhas.filter((l) => !l.problema);
  return {
    linhas, subtotalCentavos: ok.reduce((s, l) => s + l.subtotalCentavos, 0), quantidadeTotal: linhas.reduce((s, l) => s + l.quantidade, 0),
    temProblemas: linhas.some((l) => l.problema), prazoPreparoDias: ok.reduce((m, l) => Math.max(m, l.prazoDias), 0),
    temSobEncomenda: ok.some((l) => l.produto.tipo === "SOB_ENCOMENDA"),
  };
}

/** Faz o carrinho refletir o que é possível comprar (reduz quantidades acima do estoque, remove indisponíveis). */
export async function ajustarCarrinho(token: string | null | undefined) {
  const cart = await lerCarrinho(token);
  for (const l of cart.linhas) {
    if (!l.problema) continue;
    if (l.quantidadeMaxima < 1) await db.itemCarrinho.delete({ where: { id: l.itemId } });
    else await db.itemCarrinho.update({ where: { id: l.itemId }, data: { quantidade: l.quantidadeMaxima } });
  }
  return cart.linhas.filter((l) => l.problema).length;
}
