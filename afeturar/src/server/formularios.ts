import { textoParaCentavos } from "@/lib/moeda";

/** Converte o FormData do cadastro de produto para o formato do schema. Valores ilegíveis viram NaN/inválidos e são barrados pela validação. */

const str = (fd: FormData, k: string) => String(fd.get(k) ?? "").trim();
const bool = (fd: FormData, k: string) => fd.get(k) === "on" || fd.get(k) === "true";
const inteiro = (fd: FormData, k: string) => {
  const v = str(fd, k);
  return v === "" ? null : Number(v.replace(",", "."));
};
const dinheiro = (fd: FormData, k: string) => {
  const v = str(fd, k);
  if (v === "") return null;
  return textoParaCentavos(v) ?? Number.NaN;
};
const json = (fd: FormData, k: string): unknown[] => {
  try {
    const v = JSON.parse(str(fd, k) || "[]");
    return Array.isArray(v) ? v : [];
  } catch {
    return [];
  }
};

export function produtoDeFormData(fd: FormData) {
  return {
    nome: str(fd, "nome"),
    descricao: str(fd, "descricao"),
    caracteristicas: str(fd, "caracteristicas").split("\n").map((l) => l.trim()).filter(Boolean),
    material: str(fd, "material"),
    cuidados: str(fd, "cuidados"),
    tipo: str(fd, "tipo"),
    categoriaId: str(fd, "categoriaId"),
    ativo: bool(fd, "ativo"),
    destaque: bool(fd, "destaque"),
    personalizavel: bool(fd, "personalizavel"),
    precoCentavos: dinheiro(fd, "preco") ?? 0,
    precoPromocionalCentavos: dinheiro(fd, "promocional"),
    larguraMm: inteiro(fd, "larguraMm"),
    alturaMm: inteiro(fd, "alturaMm"),
    profundidadeMm: inteiro(fd, "profundidadeMm"),
    pesoEmbalagemG: inteiro(fd, "pesoEmbalagemG"),
    compEmbalagemMm: inteiro(fd, "compEmbalagemMm"),
    largEmbalagemMm: inteiro(fd, "largEmbalagemMm"),
    altEmbalagemMm: inteiro(fd, "altEmbalagemMm"),
    prazoPreparoDias: inteiro(fd, "prazoPreparoDias") ?? 0,
    seoTitulo: str(fd, "seoTitulo"),
    seoDescricao: str(fd, "seoDescricao"),
    variacoes: (json(fd, "variacoesJson") as Record<string, unknown>[]).map((v) => ({
      id: v.id || undefined,
      sku: String(v.sku ?? ""),
      corId: v.corId || null,
      tamanho: String(v.tamanho ?? ""),
      precoCentavos: v.preco ? (textoParaCentavos(String(v.preco)) ?? Number.NaN) : null,
      estoque: String(v.estoque ?? "") === "" ? Number.NaN : Number(v.estoque),
      prazoPreparoDias: String(v.prazo ?? "") === "" ? null : Number(v.prazo),
      disponivel: v.disponivel !== false,
      ativa: v.ativa !== false,
    })),
    opcoesPersonalizacao: (json(fd, "opcoesJson") as Record<string, unknown>[]).map((o) => ({
      id: o.id || undefined,
      rotulo: String(o.rotulo ?? ""),
      obrigatoria: !!o.obrigatoria,
      maxCaracteres: Number(o.maxCaracteres ?? 60),
    })),
  };
}

/** Transforma os erros do zod em { "campo": "mensagem" } (primeira mensagem de cada campo). */
export function errosDoZod(issues: { path: PropertyKey[]; message: string }[]) {
  const erros: Record<string, string> = {};
  for (const i of issues) {
    const chave = i.path.map(String).join(".") || "_";
    erros[chave] ??= i.message;
  }
  return erros;
}
