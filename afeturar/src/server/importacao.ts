import { textoParaCentavos } from "@/lib/moeda";
import { produtoSchema, type ProdutoInput } from "./validacao";

/**
 * Importação de catálogo a partir da planilha modelo (uma linha por variação).
 * Esta parte é pura (sem banco): recebe as linhas lidas e devolve produtos validados + erros por linha.
 */

export type Linha = { numero: number; celulas: Record<string, unknown> };
export interface Referencias {
  categorias: { id: string; nome: string }[];
  cores: { id: string; nome: string }[];
}
export interface ProdutoImportado {
  linha: number;
  entrada: ProdutoInput;
  /** Fotos por SKU (na ordem em que aparecem). */
  fotos: { sku: string; arquivo: string }[];
  /** Cores novas citadas na planilha e ainda inexistentes (serão criadas ao aplicar). */
  coresNovas: string[];
}
export interface ResultadoImportacao {
  produtos: ProdutoImportado[];
  erros: { linha: number; produto: string; campo: string; mensagem: string }[];
  avisos: { linha: number; produto: string; mensagem: string }[];
  ignorados: { linha: number; produto: string; motivo: string }[];
}

// Cabeçalho (prefixo normalizado) → chave interna.
const CABECALHOS: [string, string][] = [
  ["incluir na loja", "incluir"], ["produto", "nome"], ["categoria da loja", "categoria"], ["disponibilidade", "tipo"],
  ["preco de venda", "preco"], ["preco promocional", "promocional"], ["descricao", "descricao"], ["caracteristicas", "caracteristicas"],
  ["material", "material"], ["cuidados", "cuidados"], ["largura da peca", "larguraMm"], ["altura da peca", "alturaMm"], ["profundidade da peca", "profundidadeMm"],
  ["embalagem: peso", "pesoEmbalagemG"], ["embalagem: comprimento", "compEmbalagemMm"], ["embalagem: largura", "largEmbalagemMm"], ["embalagem: altura", "altEmbalagemMm"],
  ["prazo de preparo", "prazoPreparoDias"], ["aceita personalizacao", "personalizavel"], ["campo de personalizacao", "rotuloPersonalizacao"], ["destaque", "destaque"],
  ["sku", "sku"], ["cor", "cor"], ["tamanho", "tamanho"], ["preco da variacao", "precoVariacao"], ["estoque", "estoque"], ["prazo da variacao", "prazoVariacao"], ["fotos", "fotos"],
];

export const normalizar = (s: unknown) =>
  String(s ?? "").normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase().replace(/\s+/g, " ").trim();

/** Converte a linha de cabeçalho da planilha em um mapa coluna → chave interna (ignora colunas de referência). */
export function mapearCabecalhos(cabecalhos: unknown[]): Record<number, string> {
  const mapa: Record<number, string> = {};
  cabecalhos.forEach((h, i) => {
    const n = normalizar(h);
    if (!n || n.includes("referencia") || n.startsWith("observacoes")) return;
    const achado = CABECALHOS.find(([prefixo]) => n.startsWith(prefixo));
    if (achado) mapa[i] = achado[1];
  });
  return mapa;
}

const texto = (v: unknown) => (v == null ? "" : String(v).trim());
const simNao = (v: unknown): boolean | null => {
  const n = normalizar(v);
  if (!n) return null;
  if (["sim", "s", "yes", "true", "1"].includes(n)) return true;
  if (["nao", "n", "no", "false", "0"].includes(n)) return false;
  return null;
};
function dinheiro(v: unknown): number | null | "invalido" {
  if (v == null || v === "") return null;
  if (typeof v === "number") return Number.isFinite(v) && v >= 0 ? Math.round(v * 100) : "invalido";
  const c = textoParaCentavos(texto(v));
  return c == null ? "invalido" : c;
}
function inteiro(v: unknown): number | null | "invalido" {
  if (v == null || v === "") return null;
  const n = typeof v === "number" ? v : Number(texto(v).replace(",", "."));
  return Number.isFinite(n) && n >= 0 ? Math.round(n) : "invalido";
}

export function processarLinhas(linhas: Linha[], ref: Referencias): ResultadoImportacao {
  const res: ResultadoImportacao = { produtos: [], erros: [], avisos: [], ignorados: [] };
  const catPorNome = new Map(ref.categorias.map((c) => [normalizar(c.nome), c.id]));
  const corPorNome = new Map(ref.cores.map((c) => [normalizar(c.nome), c.id]));
  const skusVistos = new Set<string>();
  let seq = 0;

  // Agrupa por nome do produto (linhas de variação seguem a primeira).
  const grupos = new Map<string, Linha[]>();
  for (const l of linhas) {
    const nome = texto(l.celulas.nome);
    const vazia = Object.values(l.celulas).every((v) => texto(v) === "");
    if (vazia) continue;
    if (!nome) { res.erros.push({ linha: l.numero, produto: "(sem nome)", campo: "Produto", mensagem: "Linha sem o nome do produto." }); continue; }
    const k = normalizar(nome);
    grupos.set(k, [...(grupos.get(k) ?? []), l]);
  }

  for (const [, grupo] of grupos) {
    const primeira = grupo[0];
    const c = primeira.celulas;
    const nome = texto(c.nome);
    const erro = (linha: number, campo: string, mensagem: string) => res.erros.push({ linha, produto: nome, campo, mensagem });
    const nErrosAntes = res.erros.length;

    if (simNao(c.incluir) === false) { res.ignorados.push({ linha: primeira.numero, produto: nome, motivo: "Marcado como \"Não\" em Incluir na loja." }); continue; }

    // Categoria
    const catNome = texto(c.categoria);
    const categoriaId = catNome ? catPorNome.get(normalizar(catNome)) : undefined;
    if (!catNome) erro(primeira.numero, "Categoria da loja", "Escolha a categoria.");
    else if (!categoriaId) erro(primeira.numero, "Categoria da loja", `Categoria \"${catNome}\" não existe na loja.`);

    // Disponibilidade
    const tipoN = normalizar(c.tipo);
    const tipo = tipoN === "pronta entrega" || tipoN === "pronta para envio" ? "PRONTA_ENTREGA" : tipoN === "sob encomenda" ? "SOB_ENCOMENDA" : null;
    if (!tipo) erro(primeira.numero, "Disponibilidade", "Escolha Pronta entrega ou Sob encomenda.");

    // Números
    const num = (chave: string, rotulo: string, f: typeof inteiro | typeof dinheiro) => {
      const v = f(c[chave]);
      if (v === "invalido") { erro(primeira.numero, rotulo, "Valor inválido."); return null; }
      return v;
    };
    const preco = num("preco", "Preço de venda", dinheiro);
    if (preco == null) erro(primeira.numero, "Preço de venda", "Informe o preço de venda.");
    const promocional = num("promocional", "Preço promocional", dinheiro);
    const dims = {
      larguraMm: num("larguraMm", "Largura da peça", inteiro), alturaMm: num("alturaMm", "Altura da peça", inteiro), profundidadeMm: num("profundidadeMm", "Profundidade da peça", inteiro),
      pesoEmbalagemG: num("pesoEmbalagemG", "Embalagem: peso", inteiro), compEmbalagemMm: num("compEmbalagemMm", "Embalagem: comprimento", inteiro),
      largEmbalagemMm: num("largEmbalagemMm", "Embalagem: largura", inteiro), altEmbalagemMm: num("altEmbalagemMm", "Embalagem: altura", inteiro),
    };
    const prazo = num("prazoPreparoDias", "Prazo de preparo", inteiro) ?? 0;
    for (const k of Object.keys(dims) as (keyof typeof dims)[]) if (dims[k] === 0) dims[k] = null; // zero = "não informado"

    // Personalização
    const pers = simNao(c.personalizavel) === true;
    const rotulo = texto(c.rotuloPersonalizacao);
    if (pers && !rotulo) erro(primeira.numero, "Campo de personalização", "Informe o rótulo do campo (ex.: Nome a gravar).");

    // Variações
    const coresNovas: string[] = [];
    const fotos: ProdutoImportado["fotos"] = [];
    const variacoes = grupo.map((l) => {
      const v = l.celulas;
      let sku = texto(v.sku).toUpperCase().replace(/\s+/g, "-");
      if (!sku) sku = `AFT-${String(++seq).padStart(4, "0")}`;
      while (skusVistos.has(sku) && !texto(v.sku)) sku = `AFT-${String(++seq).padStart(4, "0")}`;
      skusVistos.add(sku);
      const corTxt = texto(v.cor);
      let corId: string | null = null;
      if (corTxt) {
        corId = corPorNome.get(normalizar(corTxt)) ?? null;
        if (!corId) { if (!coresNovas.includes(corTxt)) coresNovas.push(corTxt); corId = `nova:${corTxt}`; }
      }
      const pv = dinheiro(v.precoVariacao);
      if (pv === "invalido") erro(l.numero, "Preço da variação", "Valor inválido.");
      const est = inteiro(v.estoque);
      if (est === "invalido") erro(l.numero, "Estoque", "Valor inválido.");
      if (est == null && tipo === "PRONTA_ENTREGA") erro(l.numero, "Estoque", "Informe o estoque (use 0 se não houver).");
      const pz = inteiro(v.prazoVariacao);
      if (pz === "invalido") erro(l.numero, "Prazo da variação", "Valor inválido.");
      for (const f of texto(v.fotos).split(";").map((x) => x.trim()).filter(Boolean)) fotos.push({ sku, arquivo: f });
      return {
        sku, corId, tamanho: texto(v.tamanho) || null,
        precoCentavos: pv === "invalido" ? null : pv, estoque: est === "invalido" || est == null ? 0 : est,
        prazoPreparoDias: pz === "invalido" ? null : pz, disponivel: true, ativa: true,
      };
    });

    if (res.erros.length > nErrosAntes) continue; // já há erros de leitura: não valida o resto

    const entrada = {
      nome, descricao: texto(c.descricao) || null,
      caracteristicas: texto(c.caracteristicas).split(";").map((x) => x.trim()).filter(Boolean),
      material: texto(c.material) || null, cuidados: texto(c.cuidados) || null,
      tipo, categoriaId, ativo: false, destaque: simNao(c.destaque) === true, personalizavel: pers,
      precoCentavos: preco, precoPromocionalCentavos: promocional, ...dims, prazoPreparoDias: prazo,
      seoTitulo: null, seoDescricao: null, variacoes,
      opcoesPersonalizacao: pers ? [{ rotulo, obrigatoria: true, maxCaracteres: 60 }] : [],
    };
    const r = produtoSchema.safeParse(entrada);
    if (!r.success) {
      for (const i of r.error.issues) {
        const [raiz, idx] = i.path;
        const linha = raiz === "variacoes" && typeof idx === "number" ? grupo[idx].numero : primeira.numero;
        erro(linha, String(i.path.join(".") || "produto"), i.message);
      }
      continue;
    }
    if (!fotos.length) res.avisos.push({ linha: primeira.numero, produto: nome, mensagem: "Sem fotos: ficará como rascunho até você adicionar pelo painel." });
    if (!entrada.descricao) res.avisos.push({ linha: primeira.numero, produto: nome, mensagem: "Sem descrição." });
    if (!dims.pesoEmbalagemG) res.avisos.push({ linha: primeira.numero, produto: nome, mensagem: "Sem peso/medidas da embalagem (necessário para calcular o frete)." });
    res.produtos.push({ linha: primeira.numero, entrada: r.data, fotos, coresNovas });
  }
  return res;
}
