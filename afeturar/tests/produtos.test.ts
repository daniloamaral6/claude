import { afterAll, beforeEach, describe, expect, it } from "vitest";
import { atualizarProduto, criarProduto, listarProdutos, obterProduto, removerProduto } from "../src/server/produtos";
import { atualizarCategoria, criarCategoria, excluirCategoria } from "../src/server/categorias";
import { criarCor, excluirCor } from "../src/server/cores";
import { limparBanco, prisma } from "./helpers";

beforeEach(limparBanco);
afterAll(() => prisma.$disconnect());

async function cenario() {
  const autor = await prisma.usuario.create({ data: { email: "a@a.com", papel: "ADMIN" } });
  const cat = await criarCategoria({ nome: "Casa & Decoração", ordem: 0, ativa: true, paiId: null, descricao: null }, autor.id);
  const cor = await criarCor({ nome: "Terracota", hex: "#c1846f", ativa: true }, autor.id);
  const entrada = (extra: Record<string, unknown> = {}) => ({
    nome: "Vaso de teste", tipo: "PRONTA_ENTREGA", categoriaId: cat.id, precoCentavos: 5000,
    variacoes: [{ sku: "vaso-01", corId: cor.id, estoque: 3 }], ...extra,
  });
  return { autor, cat, cor, entrada };
}

describe("produtos", () => {
  it("cria como rascunho, normaliza SKU e gera slug único", async () => {
    const { autor, entrada } = await cenario();
    const a = await criarProduto(entrada(), autor.id);
    const b = await criarProduto(entrada({ variacoes: [{ sku: "vaso-02", estoque: 1 }] }), autor.id);
    expect(a.ativo).toBe(false);
    expect(a.slug).toBe("vaso-de-teste");
    expect(b.slug).toBe("vaso-de-teste-2");
    expect((await obterProduto(a.id))?.variacoes[0].sku).toBe("VASO-01");
  });

  it("não permite criar já publicado (precisa de fotos antes)", async () => {
    const { autor, entrada } = await cenario();
    await expect(criarProduto(entrada({ ativo: true }), autor.id)).rejects.toThrow(/rascunho/);
  });

  it.each([
    ["preço zero", { precoCentavos: 0 }],
    ["nome vazio", { nome: " " }],
    ["promoção maior que o preço", { precoPromocionalCentavos: 6000 }],
    ["estoque negativo", { variacoes: [{ sku: "ab-1", estoque: -1 }] }],
    ["estoque quebrado", { variacoes: [{ sku: "ab-1", estoque: 1.5 }] }],
    ["SKU inválido", { variacoes: [{ sku: "a b", estoque: 1 }] }],
    ["SKUs repetidos", { variacoes: [{ sku: "ab-1", estoque: 1 }, { sku: "AB-1", tamanho: "G", estoque: 1 }] }],
    ["variação repetida", { variacoes: [{ sku: "ab-1", estoque: 1 }, { sku: "ab-2", estoque: 1 }] }],
  ])("rejeita %s", async (_nome, extra) => {
    const { autor, entrada } = await cenario();
    await expect(criarProduto(entrada(extra), autor.id)).rejects.toThrow();
  });

  it("rejeita categoria ou cor inexistente e SKU de outro produto", async () => {
    const { autor, entrada } = await cenario();
    await expect(criarProduto(entrada({ categoriaId: "nao-existe" }), autor.id)).rejects.toThrow(/Categoria/);
    await expect(criarProduto(entrada({ variacoes: [{ sku: "zz-1", corId: "nao-existe", estoque: 1 }] }), autor.id)).rejects.toThrow(/cores/);
    await criarProduto(entrada(), autor.id);
    await expect(criarProduto(entrada({ nome: "Outro" }), autor.id)).rejects.toThrow(/SKU já usado/);
  });

  it("só publica com ao menos uma foto e uma variação ativa", async () => {
    const { autor, entrada } = await cenario();
    const p = await criarProduto(entrada(), autor.id);
    const atual = await obterProduto(p.id);
    const publicar = (extra = {}) => atualizarProduto(p.id, { ...entrada({ variacoes: [{ id: atual!.variacoes[0].id, sku: "vaso-01", estoque: 3 }], ...extra }), ativo: true }, autor.id);
    await expect(publicar()).rejects.toThrow(/foto/);
    await prisma.produtoImagem.create({ data: { produtoId: p.id, url: "/media/x", alt: "x" } });
    await expect(publicar({ variacoes: [{ id: atual!.variacoes[0].id, sku: "vaso-01", estoque: 3, ativa: false }] })).rejects.toThrow(/variação ativa/);
    expect((await publicar())?.ativo).toBe(true);
  });

  it("atualiza variações: edita, cria e remove (apaga se nunca vendida, desativa se já vendida)", async () => {
    const { autor, entrada } = await cenario();
    const p = await criarProduto(entrada({ variacoes: [{ sku: "a-1", estoque: 1 }, { sku: "a-2", tamanho: "G", estoque: 1 }, { sku: "a-3", tamanho: "M", estoque: 1 }] }), autor.id);
    const v = (await obterProduto(p.id))!.variacoes;
    const pedido = await prisma.pedido.create({
      data: { email: "x@x.com", nome: "X", aceitouTermosEm: new Date(), subtotalCentavos: 5000, totalCentavos: 5000, entregaDestinatario: "X", entregaCep: "1", entregaLogradouro: "R", entregaNumero: "1", entregaBairro: "B", entregaCidade: "C", entregaUf: "SP",
        itens: { create: { variacaoId: v[2].id, nomeProduto: "Vaso", sku: "A-3", precoUnitarioCentavos: 5000, quantidade: 1 } } },
    });
    expect(pedido.id).toBeTruthy();

    await atualizarProduto(p.id, entrada({ variacoes: [{ id: v[0].id, sku: "a-1", estoque: 9 }, { sku: "a-4", tamanho: "P", estoque: 2 }] }), autor.id);
    const depois = (await obterProduto(p.id))!.variacoes;
    expect(depois.find((x) => x.sku === "A-1")?.estoque).toBe(9);
    expect(depois.some((x) => x.sku === "A-2")).toBe(false); // nunca vendida: apagada
    expect(depois.find((x) => x.sku === "A-3")?.ativa).toBe(false); // vendida: preservada, desativada
    expect(depois.some((x) => x.sku === "A-4")).toBe(true);
  });

  it("não aceita variação de outro produto", async () => {
    const { autor, entrada } = await cenario();
    const a = await criarProduto(entrada(), autor.id);
    const b = await criarProduto(entrada({ nome: "Produto B", variacoes: [{ sku: "b-1", estoque: 1 }] }), autor.id);
    const vb = (await obterProduto(b.id))!.variacoes[0];
    await expect(atualizarProduto(a.id, entrada({ variacoes: [{ id: vb.id, sku: "b-1", estoque: 1 }] }), autor.id)).rejects.toThrow(/inválida/);
  });

  it("excluir: apaga se nunca vendido, só despublica se já vendido", async () => {
    const { autor, entrada } = await cenario();
    const limpo = await criarProduto(entrada(), autor.id);
    expect((await removerProduto(limpo.id, autor.id)).excluido).toBe(true);
    const vendido = await criarProduto(entrada({ nome: "Vendido", variacoes: [{ sku: "v-1", estoque: 1 }] }), autor.id);
    const v = (await obterProduto(vendido.id))!.variacoes[0];
    await prisma.pedido.create({
      data: { email: "x@x.com", nome: "X", aceitouTermosEm: new Date(), subtotalCentavos: 1, totalCentavos: 1, entregaDestinatario: "X", entregaCep: "1", entregaLogradouro: "R", entregaNumero: "1", entregaBairro: "B", entregaCidade: "C", entregaUf: "SP",
        itens: { create: { variacaoId: v.id, nomeProduto: "V", sku: "V-1", precoUnitarioCentavos: 1, quantidade: 1 } } },
    });
    expect((await removerProduto(vendido.id, autor.id)).excluido).toBe(false);
    expect(await obterProduto(vendido.id)).not.toBeNull();
  });

  it("lista com busca por nome ou SKU e registra auditoria", async () => {
    const { autor, entrada } = await cenario();
    await criarProduto(entrada(), autor.id);
    expect((await listarProdutos({ busca: "vaso" })).total).toBe(1);
    expect((await listarProdutos({ busca: "VASO-01" })).total).toBe(1);
    expect((await listarProdutos({ busca: "inexistente" })).total).toBe(0);
    expect((await listarProdutos({ status: "ativo" })).total).toBe(0);
    expect(await prisma.logAuditoria.count({ where: { entidade: "Produto", acao: "criar" } })).toBe(1);
  });
});

describe("categorias e cores", () => {
  it("aceita um nível de subcategoria e bloqueia ciclos", async () => {
    const { autor, cat } = await cenario();
    const filha = await criarCategoria({ nome: "Vasos", ordem: 0, ativa: true, paiId: cat.id, descricao: null }, autor.id);
    await expect(criarCategoria({ nome: "Neta", ordem: 0, ativa: true, paiId: filha.id, descricao: null }, autor.id)).rejects.toThrow(/um nível/);
    await expect(atualizarCategoria(cat.id, { nome: "X", ordem: 0, ativa: true, paiId: cat.id, descricao: null }, autor.id)).rejects.toThrow();
    await expect(atualizarCategoria(cat.id, { nome: "X", ordem: 0, ativa: true, paiId: filha.id, descricao: null }, autor.id)).rejects.toThrow();
  });

  it("não exclui categoria com produtos ou subcategorias", async () => {
    const { autor, cat, entrada } = await cenario();
    await criarProduto(entrada(), autor.id);
    await expect(excluirCategoria(cat.id, autor.id)).rejects.toThrow(/produtos/);
    const vazia = await criarCategoria({ nome: "Vazia", ordem: 0, ativa: true, paiId: null, descricao: null }, autor.id);
    await expect(excluirCategoria(vazia.id, autor.id)).resolves.toBeUndefined();
  });

  it("cores: nova cor sem código, nome repetido e hex inválido são rejeitados, cor em uso não é excluída", async () => {
    const { autor, cor, entrada } = await cenario();
    await expect(criarCor({ nome: "Terracota", ativa: true, hex: null }, autor.id)).rejects.toThrow(/Já existe/);
    await expect(criarCor({ nome: "Azul", ativa: true, hex: "azul" }, autor.id)).rejects.toThrow();
    await criarProduto(entrada(), autor.id);
    await expect(excluirCor(cor.id, autor.id)).rejects.toThrow(/usada/);
  });
});
