import { z } from "zod";

const texto = (max: number) => z.string().trim().max(max);
const textoOpcional = (max: number) => texto(max).transform((v) => v || null).nullable().optional().transform((v) => v ?? null);
const inteiroOpcional = (min: number, max: number) => z.number().int().min(min).max(max).nullable().optional().transform((v) => v ?? null);

export const variacaoSchema = z.object({
  id: z.string().optional(),
  sku: z.string().trim().toUpperCase().regex(/^[A-Z0-9._-]{2,40}$/, "SKU: 2 a 40 caracteres (letras, números, ponto, hífen ou sublinhado)."),
  corId: z.string().nullable().optional().transform((v) => v || null),
  tamanho: textoOpcional(40),
  precoCentavos: inteiroOpcional(1, 99_999_999),
  estoque: z.number().int("Estoque deve ser inteiro.").min(0, "Estoque não pode ser negativo.").max(1_000_000),
  prazoPreparoDias: inteiroOpcional(0, 120),
  disponivel: z.boolean().default(true),
  ativa: z.boolean().default(true),
});

export const opcaoPersonalizacaoSchema = z.object({
  id: z.string().optional(),
  rotulo: texto(80).min(1, "Informe o rótulo do campo de personalização."),
  obrigatoria: z.boolean().default(false),
  maxCaracteres: z.number().int().min(1).max(200).default(60),
});

export const produtoSchema = z
  .object({
    nome: texto(120).min(2, "Informe o nome do produto."),
    descricao: textoOpcional(5000),
    caracteristicas: z.array(texto(200).min(1)).max(20).default([]),
    material: textoOpcional(300),
    cuidados: textoOpcional(500),
    tipo: z.enum(["PRONTA_ENTREGA", "SOB_ENCOMENDA"]),
    categoriaId: z.string().min(1, "Escolha uma categoria."),
    ativo: z.boolean().default(false),
    destaque: z.boolean().default(false),
    personalizavel: z.boolean().default(false),
    precoCentavos: z.number().int("Preço inválido.").min(1, "Informe o preço.").max(99_999_999),
    precoPromocionalCentavos: inteiroOpcional(1, 99_999_999),
    larguraMm: inteiroOpcional(1, 10_000),
    alturaMm: inteiroOpcional(1, 10_000),
    profundidadeMm: inteiroOpcional(1, 10_000),
    pesoEmbalagemG: inteiroOpcional(1, 100_000),
    compEmbalagemMm: inteiroOpcional(1, 10_000),
    largEmbalagemMm: inteiroOpcional(1, 10_000),
    altEmbalagemMm: inteiroOpcional(1, 10_000),
    prazoPreparoDias: z.number().int().min(0).max(120).default(0),
    seoTitulo: textoOpcional(70),
    seoDescricao: textoOpcional(160),
    variacoes: z.array(variacaoSchema).max(100).default([]),
    opcoesPersonalizacao: z.array(opcaoPersonalizacaoSchema).max(10).default([]),
  })
  .superRefine((p, ctx) => {
    if (p.precoPromocionalCentavos != null && p.precoPromocionalCentavos >= p.precoCentavos)
      ctx.addIssue({ code: "custom", path: ["precoPromocionalCentavos"], message: "O preço promocional deve ser menor que o preço." });
    const skus = p.variacoes.map((v) => v.sku);
    if (new Set(skus).size !== skus.length) ctx.addIssue({ code: "custom", path: ["variacoes"], message: "Há SKUs repetidos nas variações." });
    const combos = p.variacoes.map((v) => `${v.corId ?? ""}|${v.tamanho ?? ""}`);
    if (new Set(combos).size !== combos.length) ctx.addIssue({ code: "custom", path: ["variacoes"], message: "Há variações repetidas (mesma cor e tamanho)." });
    p.variacoes.forEach((v, i) => {
      if (v.precoCentavos != null && p.precoPromocionalCentavos != null && p.precoPromocionalCentavos >= v.precoCentavos)
        ctx.addIssue({ code: "custom", path: ["variacoes", i, "precoCentavos"], message: "Preço da variação deve ser maior que o promocional do produto." });
    });
    if (p.ativo && !p.variacoes.some((v) => v.ativa))
      ctx.addIssue({ code: "custom", path: ["variacoes"], message: "Para publicar, cadastre ao menos uma variação ativa (com SKU e estoque)." });
  });

export type ProdutoInput = z.infer<typeof produtoSchema>;
export type VariacaoInput = z.infer<typeof variacaoSchema>;

export const categoriaSchema = z.object({
  nome: texto(80).min(2, "Informe o nome da categoria."),
  descricao: textoOpcional(500),
  paiId: z.string().nullable().optional().transform((v) => v || null),
  ordem: z.number().int().min(0).max(9999).default(0),
  ativa: z.boolean().default(true),
});
export type CategoriaInput = z.infer<typeof categoriaSchema>;

export const corSchema = z.object({
  nome: texto(40).min(2, "Informe o nome da cor."),
  hex: z.string().trim().regex(/^#[0-9a-fA-F]{6}$/, "Cor no formato #RRGGBB.").nullable().optional().transform((v) => v || null),
  ativa: z.boolean().default(true),
});
export type CorInput = z.infer<typeof corSchema>;

/** CNPJ com dígitos verificadores (somente números, 14 dígitos). */
export function cnpjValido(cnpj: string): boolean {
  if (!/^\d{14}$/.test(cnpj) || /^(\d)\1+$/.test(cnpj)) return false;
  const dv = (base: string) => {
    let soma = 0, peso = base.length - 7;
    for (const c of base) { soma += Number(c) * peso--; if (peso < 2) peso = 9; }
    const r = soma % 11;
    return r < 2 ? 0 : 11 - r;
  };
  return dv(cnpj.slice(0, 12)) === Number(cnpj[12]) && dv(cnpj.slice(0, 13)) === Number(cnpj[13]);
}

const url = (dominio?: RegExp) => z.string().trim().url().refine((u) => u.startsWith("https://"), "Use um link https://").refine((u) => !dominio || dominio.test(new URL(u).hostname), "Link de outro site.");
const vazioParaNull = <T extends z.ZodTypeAny>(s: T) => z.union([z.literal("").transform(() => null), s]).nullable();

export const configuracoesSchema = z.object({
  "contato.whatsapp": vazioParaNull(z.string().trim().regex(/^\d{12,13}$/, "WhatsApp: somente números com 55 + DDD + número (12 ou 13 dígitos).")),
  "contato.email": vazioParaNull(z.string().trim().email("E-mail inválido.")),
  "empresa.cnpj": vazioParaNull(z.string().trim().refine(cnpjValido, "CNPJ inválido (somente números, 14 dígitos).")),
  "empresa.endereco": vazioParaNull(z.string().trim().max(300)),
  "redes.instagram": vazioParaNull(url(/(^|\.)instagram\.com$/)),
  "redes.facebook": vazioParaNull(url(/(^|\.)facebook\.com$/)),
  "redes.tiktok": vazioParaNull(url(/(^|\.)tiktok\.com$/)),
  "redes.pinterest": vazioParaNull(url(/(^|\.)pinterest\.[a-z.]+$/)),
  "redes.youtube": vazioParaNull(url(/(^|\.)(youtube\.com|youtu\.be)$/)),
  "frete.cepOrigem": vazioParaNull(z.string().trim().regex(/^\d{8}$/, "CEP com 8 números.")),
  "frete.gratisAPartirDeCentavos": z.number().int().min(1).max(99_999_999).nullable(),
});
export type ChaveConfiguracao = keyof z.infer<typeof configuracoesSchema>;
