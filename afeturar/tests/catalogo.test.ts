import { afterAll, beforeEach, describe, expect, it } from "vitest";
import { slugify } from "../src/lib/slug";
import { precoDaVariacao, prazoDaVariacao, quantidadeMaxima, textoPrazo, variacaoCompravel } from "../src/lib/preco";
import { categoriaPorSlug, listarProdutosPublicos, maisVendidos, novidades, obterProdutoPublico, produtosPorSlugs, relacionados } from "../src/server/catalogo";
import { indexarProduto } from "../src/server/busca";
import { dadosEntrega, limparBanco, prisma } from "./helpers";

beforeEach(limparBanco);
afterAll(() => prisma.$disconnect());

const v0 = { precoCentavos: null, precoPromocionalCentavos: null, estoque: 5, prazoPreparoDias: null, disponivel: true, ativa: true };
const p0 = { tipo: "PRONTA_ENTREGA" as const, precoCentavos: 5000, precoPromocionalCentavos: null, prazoPreparoDias: 0 };

describe("regras de preço", () => {
  it("variação usa o próprio preço; promoção só vale se for menor", () => {
    expect(precoDaVariacao(p0, v0).finalCentavos).toBe(5000);
    expect(precoDaVariacao(p0, { ...v0, precoCentavos: 7000 }).finalCentavos).toBe(7000);
    expect(precoDaVariacao({ ...p0, precoPromocionalCentavos: 4000 }, v0)).toMatchObject({ promocionalCentavos: 4000, finalCentavos: 4000 });
    expect(precoDaVariacao({ ...p0, precoPromocionalCentavos: 4000 }, { ...v0, precoCentavos: 3000 }).promocionalCentavos).toBeNull(); // promoção >= preço é ignorada
    expect(precoDaVariacao({ ...p0, precoPromocionalCentavos: 9000 }, v0).promocionalCentavos).toBeNull();
  });
  it("disponibilidade: pronta entrega exige estoque; sob encomenda não", () => {
    expect(variacaoCompravel("PRONTA_ENTREGA", { ...v0, estoque: 0 })).toBe(false);
    expect(variacaoCompravel("SOB_ENCOMENDA", { ...v0, estoque: 0 })).toBe(true);
    expect(variacaoCompravel("PRONTA_ENTREGA", { ...v0, disponivel: false })).toBe(false);
    expect(variacaoCompravel("SOB_ENCOMENDA", { ...v0, ativa: false })).toBe(false);
    expect(quantidadeMaxima("PRONTA_ENTREGA", { estoque: 3 })).toBe(3);
    expect(quantidadeMaxima("PRONTA_ENTREGA", { estoque: 500 })).toBe(20);
    expect(quantidadeMaxima("SOB_ENCOMENDA", { estoque: 0 })).toBe(20);
  });
  it("prazo e textos só dizem o que está cadastrado", () => {
    expect(prazoDaVariacao({ prazoPreparoDias: 3 }, { prazoPreparoDias: null })).toBe(3);
    expect(prazoDaVariacao({ prazoPreparoDias: 3 }, { prazoPreparoDias: 7 })).toBe(7);
    expect(textoPrazo("PRONTA_ENTREGA", 0)).toBe("Pronta para envio");
    expect(textoPrazo("SOB_ENCOMENDA", 5)).toBe("Sob encomenda · preparo de 5 dias úteis");
    expect(textoPrazo("PRONTA_ENTREGA", 1)).toBe("preparo de 1 dia útil");
  });
});

async function cenario() {
  const casa = await prisma.categoria.create({ data: { slug: "casa", nome: "Casa & Decoração", ordem: 0 } });
  const vasos = await prisma.categoria.create({ data: { slug: "vasos", nome: "Vasos", paiId: casa.id } });
  const fe = await prisma.categoria.create({ data: { slug: "fe", nome: "Fé", ordem: 1 } });
  const branco = await prisma.cor.create({ data: { slug: "branco", nome: "Branco", hex: "#f7f7f5" } });
  const rosa = await prisma.cor.create({ data: { slug: "rosa-bebe", nome: "Rosa bebê" } });
  let seq = 0;
  async function produto(nome: string, extra: Record<string, unknown> = {}, variacoes: Record<string, unknown>[] = [{ estoque: 5 }], publicado = true) {
    const p = await prisma.produto.create({
      data: { slug: slugify(nome), nome, precoCentavos: 5000, categoriaId: casa.id, ativo: publicado, criadoEm: new Date(Date.now() - (50 - seq++) * 1000), ...extra,
        variacoes: { create: variacoes.map((v, i) => ({ sku: `${nome}-${i}`.toUpperCase().replace(/\W+/g, "-"), ...v })) },
        imagens: publicado ? { create: { url: "/media/x.png", alt: `Foto de ${nome}` } } : undefined },
    });
    await indexarProduto(p.id);
    return p;
  }
  return { casa, vasos, fe, branco, rosa, produto };
}

describe("o que a loja mostra", () => {
  it("só produtos publicados, com variação ativa e categoria ativa", async () => {
    const { casa, produto } = await cenario();
    await produto("Publicado");
    await produto("Rascunho", {}, [{ estoque: 1 }], false);
    await produto("Sem variação ativa", {}, [{ estoque: 1, ativa: false }]);
    const oculta = await prisma.categoria.create({ data: { slug: "oculta", nome: "Oculta", ativa: false } });
    await produto("Em categoria oculta", { categoriaId: oculta.id });
    const r = await listarProdutosPublicos();
    expect(r.itens.map((i) => i.nome)).toEqual(["Publicado"]);
    expect(await obterProdutoPublico("rascunho")).toBeNull();
    expect(await obterProdutoPublico("em-categoria-oculta")).toBeNull();
    expect(await categoriaPorSlug("oculta")).toBeNull();
    // desativar a categoria-mãe esconde as subcategorias e seus produtos
    const sub = await prisma.categoria.create({ data: { slug: "sub", nome: "Sub", paiId: casa.id } });
    await produto("Na sub", { categoriaId: sub.id });
    expect((await listarProdutosPublicos()).total).toBe(2);
    await prisma.categoria.update({ where: { id: casa.id }, data: { ativa: false } });
    expect((await listarProdutosPublicos()).total).toBe(0);
    expect(await categoriaPorSlug("sub")).toBeNull();
  });

  it("categoria inclui as subcategorias; filtros de cor, tipo e promoção", async () => {
    const { vasos, fe, branco, rosa, produto } = await cenario();
    await produto("Vaso Branco", { categoriaId: vasos.id }, [{ estoque: 2, corId: branco.id }]);
    await produto("Placa Fé", { categoriaId: fe.id, tipo: "SOB_ENCOMENDA" }, [{ estoque: 0, corId: rosa.id }]);
    await produto("Vaso Promo", { categoriaId: vasos.id, precoPromocionalCentavos: 3000 }, [{ estoque: 2, corId: rosa.id }]);
    expect((await listarProdutosPublicos({ categoriaSlug: "casa" })).itens.map((i) => i.nome).sort()).toEqual(["Vaso Branco", "Vaso Promo"]);
    expect((await listarProdutosPublicos({ categoriaSlug: "fe" })).total).toBe(1);
    expect((await listarProdutosPublicos({ categoriaSlug: "nao-existe" })).total).toBe(0);
    expect((await listarProdutosPublicos({ cores: ["rosa-bebe"] })).itens.map((i) => i.nome).sort()).toEqual(["Placa Fé", "Vaso Promo"]);
    expect((await listarProdutosPublicos({ cores: ["branco", "rosa-bebe"] })).total).toBe(3);
    expect((await listarProdutosPublicos({ tipo: "SOB_ENCOMENDA" })).itens.map((i) => i.nome)).toEqual(["Placa Fé"]);
    expect((await listarProdutosPublicos({ promocao: true })).itens.map((i) => i.nome)).toEqual(["Vaso Promo"]);
  });

  it("busca sem diferenciar acentos, maiúsculas e em qualquer palavra (nome, descrição, categoria, cor)", async () => {
    const { fe, rosa, produto } = await cenario();
    await produto("Nossa Senhora", { categoriaId: fe.id, descricao: "Imagem para oração" }, [{ estoque: 1, corId: rosa.id }]);
    await produto("Vaso Rib");
    await produto("Porta-algodão");
    expect((await listarProdutosPublicos({ busca: "ORAÇÃO" })).total).toBe(1); // não acha "deco-ração" (só início de palavra)
    expect((await listarProdutosPublicos({ busca: "orac" })).total).toBe(1);
    expect((await listarProdutosPublicos({ busca: "racao" })).total).toBe(0);
    expect((await listarProdutosPublicos({ busca: "oracao imagem" })).total).toBe(1);
    expect((await listarProdutosPublicos({ busca: "fe" })).itens.map((i) => i.nome)).toContain("Nossa Senhora"); // categoria "Fé"
    expect((await listarProdutosPublicos({ busca: "rosa bebe" })).itens.map((i) => i.nome)).toEqual(["Nossa Senhora"]);
    expect((await listarProdutosPublicos({ busca: "vaso oracao" })).total).toBe(0);
    expect((await listarProdutosPublicos({ busca: "algodao" })).total).toBe(1); // palavra depois de hífen
    expect((await listarProdutosPublicos({ busca: "100%" })).total).toBe(0);
    expect((await listarProdutosPublicos({ busca: "%_" })).total).toBe(0); // curingas não "casam tudo"
    expect((await listarProdutosPublicos({ busca: "   " })).total).toBe(3);
  });

  it("ordena por novidade e por preço efetivo (promoção e variação)", async () => {
    const { produto } = await cenario();
    await produto("Antigo Caro", { precoCentavos: 9000 });
    await produto("Meio Promo", { precoCentavos: 8000, precoPromocionalCentavos: 2000 });
    await produto("Novo Barato", { precoCentavos: 3000 });
    await produto("Variação Cara", { precoCentavos: 1000 }, [{ estoque: 1, precoCentavos: 12000 }]);
    const nomes = async (ordem: "novidades" | "menor" | "maior") => (await listarProdutosPublicos({ ordem })).itens.map((i) => i.nome);
    expect(await nomes("novidades")).toEqual(["Variação Cara", "Novo Barato", "Meio Promo", "Antigo Caro"]);
    expect(await nomes("menor")).toEqual(["Meio Promo", "Novo Barato", "Antigo Caro", "Variação Cara"]);
    expect(await nomes("maior")).toEqual(["Variação Cara", "Antigo Caro", "Novo Barato", "Meio Promo"]);
  });

  it("pagina em blocos de 12 e limita páginas fora do intervalo", async () => {
    const { produto } = await cenario();
    for (let i = 0; i < 14; i++) await produto(`Item ${String(i).padStart(2, "0")}`);
    const a = await listarProdutosPublicos({ pagina: 1 }), b = await listarProdutosPublicos({ pagina: 2 }), c = await listarProdutosPublicos({ pagina: 99 });
    expect([a.itens.length, b.itens.length, a.total, a.paginas]).toEqual([12, 2, 14, 2]);
    expect(c.pagina).toBe(2);
    expect(new Set([...a.itens, ...b.itens].map((i) => i.id)).size).toBe(14);
  });

  it("cartão: a partir de, esgotado, cores e foto", async () => {
    const { branco, rosa, produto } = await cenario();
    await produto("Duas Cores", { precoCentavos: 5000 }, [{ estoque: 2, corId: branco.id }, { estoque: 2, corId: rosa.id, precoCentavos: 6500 }]);
    await produto("Esgotado", {}, [{ estoque: 0, corId: branco.id }]);
    await produto("Encomenda", { tipo: "SOB_ENCOMENDA" }, [{ estoque: 0 }]);
    const r = await listarProdutosPublicos({});
    const por = Object.fromEntries(r.itens.map((i) => [i.nome, i]));
    expect(por["Duas Cores"]).toMatchObject({ precoCentavos: 5000, aPartirDe: true, esgotado: false, imagemUrl: "/media/x.png", imagemAlt: "Foto de Duas Cores" });
    expect(por["Duas Cores"].cores.map((c) => c.nome).sort()).toEqual(["Branco", "Rosa bebê"]);
    expect(por["Esgotado"].esgotado).toBe(true);
    expect(por["Encomenda"].esgotado).toBe(false);
    expect((await listarProdutosPublicos({ somenteDisponiveis: true })).itens.map((i) => i.nome).sort()).toEqual(["Duas Cores", "Encomenda"]);
  });

  it("página do produto: variações com preço, disponibilidade e limites", async () => {
    const { branco, rosa, produto } = await cenario();
    await produto("Vaso", { precoCentavos: 5000, precoPromocionalCentavos: 4000, prazoPreparoDias: 2 }, [
      { estoque: 2, corId: branco.id }, { estoque: 0, corId: rosa.id, prazoPreparoDias: 6 }, { estoque: 9, tamanho: "G", precoCentavos: 8000, ativa: false },
    ]);
    const p = (await obterProdutoPublico("vaso"))!;
    expect(p.variacoes).toHaveLength(2); // a inativa não aparece
    const [b, r] = p.variacoes;
    expect(b).toMatchObject({ finalCentavos: 4000, compravel: true, quantidadeMaxima: 2, prazoDias: 2, poucasUnidades: 2 });
    expect(r).toMatchObject({ compravel: false, quantidadeMaxima: 0, prazoDias: 6 });
    expect(JSON.stringify(p)).not.toMatch(/"estoque"/); // estoque exato não vai para o navegador
  });

  it("mais vendidos só conta pedidos pagos; novidades/relacionados/por slugs", async () => {
    const { vasos, fe, produto } = await cenario();
    const a = await produto("Campeão", { categoriaId: vasos.id });
    const b = await produto("Vice", { categoriaId: vasos.id });
    await produto("Outro", { categoriaId: fe.id });
    expect(await maisVendidos()).toEqual([]);
    const va = await prisma.variacao.findFirstOrThrow({ where: { produtoId: a.id } }), vb = await prisma.variacao.findFirstOrThrow({ where: { produtoId: b.id } });
    const pedido = (status: "ENTREGUE" | "AGUARDANDO_PAGAMENTO" | "CANCELADO", variacaoId: string, q: number) => prisma.pedido.create({ data: { email: "x@x.com", nome: "X", aceitouTermosEm: new Date(), subtotalCentavos: 100, totalCentavos: 100, status, ...dadosEntrega, itens: { create: { variacaoId, nomeProduto: "p", sku: "s", precoUnitarioCentavos: 100, quantidade: q } } } });
    await pedido("AGUARDANDO_PAGAMENTO", vb.id, 50); await pedido("CANCELADO", vb.id, 50);
    await pedido("ENTREGUE", va.id, 3); await pedido("ENTREGUE", vb.id, 1);
    expect((await maisVendidos()).map((x) => x.nome)).toEqual(["Campeão", "Vice"]);
    expect((await novidades(2)).map((x) => x.nome)).toEqual(["Outro", "Vice"]);
    expect((await relacionados(a.id, vasos.id)).map((x) => x.nome)).toEqual(["Vice"]);
    expect((await produtosPorSlugs(["campeao", "inexistente"])).map((x) => x.nome)).toEqual(["Campeão"]);
  });
});
