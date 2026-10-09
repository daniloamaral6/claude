import { centavosParaTexto } from "@/lib/moeda";

/** Modelo do formulário de produto (sem "use client": usado pelo servidor e pelo cliente). */
export interface VariacaoForm { id?: string; sku: string; corId: string; tamanho: string; preco: string; estoque: string; prazo: string; disponivel: boolean; ativa: boolean }
export interface OpcaoForm { id?: string; rotulo: string; obrigatoria: boolean; maxCaracteres: number }
export interface ProdutoForm {
  id?: string; nome: string; descricao: string; caracteristicas: string; material: string; cuidados: string; tipo: "PRONTA_ENTREGA" | "SOB_ENCOMENDA";
  categoriaId: string; ativo: boolean; destaque: boolean; personalizavel: boolean; preco: string; promocional: string;
  larguraMm: string; alturaMm: string; profundidadeMm: string; pesoEmbalagemG: string; compEmbalagemMm: string; largEmbalagemMm: string; altEmbalagemMm: string;
  prazoPreparoDias: string; seoTitulo: string; seoDescricao: string; variacoes: VariacaoForm[]; opcoes: OpcaoForm[]; temFotos: boolean;
}

export const produtoVazio: ProdutoForm = {
  nome: "", descricao: "", caracteristicas: "", material: "", cuidados: "", tipo: "PRONTA_ENTREGA", categoriaId: "", ativo: false, destaque: false, personalizavel: false,
  preco: "", promocional: "", larguraMm: "", alturaMm: "", profundidadeMm: "", pesoEmbalagemG: "", compEmbalagemMm: "", largEmbalagemMm: "", altEmbalagemMm: "",
  prazoPreparoDias: "0", seoTitulo: "", seoDescricao: "", variacoes: [{ sku: "", corId: "", tamanho: "", preco: "", estoque: "0", prazo: "", disponivel: true, ativa: true }], opcoes: [], temFotos: false,
};

export const aPartirDoBanco = (p: {
  id: string; nome: string; descricao: string | null; caracteristicas: string[]; material: string | null; cuidados: string | null; tipo: "PRONTA_ENTREGA" | "SOB_ENCOMENDA"; categoriaId: string;
  ativo: boolean; destaque: boolean; personalizavel: boolean; precoCentavos: number; precoPromocionalCentavos: number | null; larguraMm: number | null; alturaMm: number | null; profundidadeMm: number | null;
  pesoEmbalagemG: number | null; compEmbalagemMm: number | null; largEmbalagemMm: number | null; altEmbalagemMm: number | null; prazoPreparoDias: number; seoTitulo: string | null; seoDescricao: string | null;
  variacoes: { id: string; sku: string; corId: string | null; tamanho: string | null; precoCentavos: number | null; estoque: number; prazoPreparoDias: number | null; disponivel: boolean; ativa: boolean }[];
  opcoesPersonalizacao: { id: string; rotulo: string; obrigatoria: boolean; maxCaracteres: number }[]; imagens: unknown[];
}): ProdutoForm => ({
  id: p.id, nome: p.nome, descricao: p.descricao ?? "", caracteristicas: p.caracteristicas.join("\n"), material: p.material ?? "", cuidados: p.cuidados ?? "", tipo: p.tipo, categoriaId: p.categoriaId,
  ativo: p.ativo, destaque: p.destaque, personalizavel: p.personalizavel, preco: centavosParaTexto(p.precoCentavos), promocional: centavosParaTexto(p.precoPromocionalCentavos),
  larguraMm: p.larguraMm?.toString() ?? "", alturaMm: p.alturaMm?.toString() ?? "", profundidadeMm: p.profundidadeMm?.toString() ?? "", pesoEmbalagemG: p.pesoEmbalagemG?.toString() ?? "",
  compEmbalagemMm: p.compEmbalagemMm?.toString() ?? "", largEmbalagemMm: p.largEmbalagemMm?.toString() ?? "", altEmbalagemMm: p.altEmbalagemMm?.toString() ?? "",
  prazoPreparoDias: String(p.prazoPreparoDias), seoTitulo: p.seoTitulo ?? "", seoDescricao: p.seoDescricao ?? "",
  variacoes: p.variacoes.map((v) => ({ id: v.id, sku: v.sku, corId: v.corId ?? "", tamanho: v.tamanho ?? "", preco: centavosParaTexto(v.precoCentavos), estoque: String(v.estoque), prazo: v.prazoPreparoDias?.toString() ?? "", disponivel: v.disponivel, ativa: v.ativa })),
  opcoes: p.opcoesPersonalizacao.map((o) => ({ id: o.id, rotulo: o.rotulo, obrigatoria: o.obrigatoria, maxCaracteres: o.maxCaracteres })),
  temFotos: p.imagens.length > 0,
});

