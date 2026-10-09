import { describe, expect, it } from "vitest";
import { errosDoZod, produtoDeFormData } from "../src/server/formularios";
import { produtoSchema } from "../src/server/validacao";

function fd(campos: Record<string, string>) {
  const f = new FormData();
  for (const [k, v] of Object.entries(campos)) f.set(k, v);
  return f;
}

describe("formulário de produto", () => {
  it("converte textos brasileiros em dados válidos", () => {
    const entrada = produtoDeFormData(fd({
      nome: " Vaso ", tipo: "SOB_ENCOMENDA", categoriaId: "c1", preco: "R$ 1.234,50", promocional: "999,90", ativo: "on",
      caracteristicas: "Resistente\n\n  Leve  ", prazoPreparoDias: "5", larguraMm: "120",
      variacoesJson: JSON.stringify([{ sku: "v-1", estoque: "3", preco: "1.300,00", tamanho: " G " }]),
    }));
    expect(entrada.precoCentavos).toBe(123450);
    expect(entrada.precoPromocionalCentavos).toBe(99990);
    expect(entrada.caracteristicas).toEqual(["Resistente", "Leve"]);
    expect(entrada.variacoes[0]).toMatchObject({ sku: "v-1", estoque: 3, precoCentavos: 130000 });
    const r = produtoSchema.safeParse(entrada);
    expect(r.success).toBe(true);
    if (r.success) { expect(r.data.variacoes[0].sku).toBe("V-1"); expect(r.data.variacoes[0].tamanho).toBe("G"); }
  });

  it("JSON adulterado ou preço ilegível nunca passa na validação", () => {
    const ruim = produtoDeFormData(fd({ nome: "Vaso", tipo: "PRONTA_ENTREGA", categoriaId: "c", preco: "abc", variacoesJson: "{nao-e-json" }));
    expect(ruim.variacoes).toEqual([]);
    const r = produtoSchema.safeParse(ruim);
    expect(r.success).toBe(false);
  });

  it("rejeita tipo desconhecido, estoque vazio e campos extras de preço negativo", () => {
    const e = produtoDeFormData(fd({ nome: "Vaso", tipo: "OUTRO", categoriaId: "c", preco: "10", variacoesJson: JSON.stringify([{ sku: "ab-1", estoque: "" }]) }));
    const r = produtoSchema.safeParse(e);
    expect(r.success).toBe(false);
    if (!r.success) {
      const erros = errosDoZod(r.error.issues);
      expect(erros.tipo).toBeTruthy();
      expect(erros["variacoes.0.estoque"]).toBeTruthy();
    }
  });
});
