import { afterAll, beforeEach, describe, expect, it } from "vitest";
import { adicionarItem, ajustarCarrinho, alterarQuantidade, contarItens, lerCarrinho, removerItem, validarPersonalizacao } from "../src/server/carrinho";
import { limparBanco, prisma } from "./helpers";

beforeEach(limparBanco);
afterAll(() => prisma.$disconnect());

async function loja() {
  const cat = await prisma.categoria.create({ data: { slug: "c", nome: "C" } });
  const cor = await prisma.cor.create({ data: { slug: "branco", nome: "Branco" } });
  const mk = async (nome: string, extra: Record<string, unknown> = {}, v: Record<string, unknown> = {}) => {
    const p = await prisma.produto.create({
      data: { slug: nome.toLowerCase().replace(/\W+/g, "-"), nome, precoCentavos: 5000, categoriaId: cat.id, ativo: true, ...extra,
        variacoes: { create: { sku: nome.toUpperCase().replace(/\W+/g, "-"), estoque: 5, corId: cor.id, ...v } },
        imagens: { create: { url: "/media/a.png", alt: nome } } },
      include: { variacoes: true },
    });
    return { produto: p, variacao: p.variacoes[0] };
  };
  return { cat, cor, mk };
}

describe("carrinho", () => {
  it("cria carrinho no primeiro item, guarda só o hash do token e lê preços do banco", async () => {
    const { mk } = await loja();
    const { variacao } = await mk("Vaso", { precoPromocionalCentavos: 4000 });
    const r = await adicionarItem(null, { variacaoId: variacao.id, quantidade: 2 });
    expect(r.token).toBeTruthy();
    const salvo = await prisma.carrinho.findFirstOrThrow();
    expect(salvo.tokenVisitante).not.toContain(r.token!);
    expect(salvo.tokenVisitante).toHaveLength(64);
    const c = await lerCarrinho(r.token);
    expect(c.linhas).toHaveLength(1);
    expect(c.linhas[0]).toMatchObject({ quantidade: 2, precoUnitarioCentavos: 4000, precoOriginalCentavos: 5000, subtotalCentavos: 8000, problema: null });
    expect(c.subtotalCentavos).toBe(8000);
    expect(await contarItens(r.token)).toBe(2);
  });

  it("soma o mesmo item, mas respeita estoque e limite por item", async () => {
    const { mk } = await loja();
    const { variacao } = await mk("Vaso", {}, { estoque: 3 });
    const t = (await adicionarItem(null, { variacaoId: variacao.id, quantidade: 2 })).token!;
    expect((await adicionarItem(t, { variacaoId: variacao.id, quantidade: 1 })).token).toBeNull();
    expect((await lerCarrinho(t)).linhas[0].quantidade).toBe(3);
    await expect(adicionarItem(t, { variacaoId: variacao.id, quantidade: 1 })).rejects.toThrow(/Só temos 3/);
    await expect(alterarQuantidade(t, (await lerCarrinho(t)).linhas[0].itemId, 4)).rejects.toThrow(/Só temos 3/);
    await alterarQuantidade(t, (await lerCarrinho(t)).linhas[0].itemId, 1);
    expect(await contarItens(t)).toBe(1);
    const enc = await mk("Sob encomenda", { tipo: "SOB_ENCOMENDA" }, { estoque: 0 });
    await expect(adicionarItem(t, { variacaoId: enc.variacao.id, quantidade: 21 })).rejects.toThrow(/limite/);
    await adicionarItem(t, { variacaoId: enc.variacao.id, quantidade: 20 });
  });

  it("recusa quantidade inválida e itens indisponíveis ou de produto não publicado", async () => {
    const { mk } = await loja();
    const ok = await mk("Ok");
    for (const q of [0, -1, 1.5 * 0, NaN, "abc" as unknown as number]) await expect(adicionarItem(null, { variacaoId: ok.variacao.id, quantidade: q })).rejects.toThrow();
    const esgotado = await mk("Esgotado", {}, { estoque: 0 });
    const inativa = await mk("Inativa", {}, { ativa: false });
    const indisp = await mk("Indisp", {}, { disponivel: false });
    const rascunho = await mk("Rascunho", { ativo: false });
    for (const x of [esgotado, inativa, indisp, rascunho]) await expect(adicionarItem(null, { variacaoId: x.variacao.id, quantidade: 1 })).rejects.toThrow(/indispon|não está mais/);
    await expect(adicionarItem(null, { variacaoId: "nao-existe", quantidade: 1 })).rejects.toThrow();
    expect(await prisma.carrinho.count()).toBe(0); // nada é criado quando falha
  });

  it("personalização: valida campos, limpa texto e separa linhas por texto", async () => {
    const { mk } = await loja();
    const { produto, variacao } = await mk("Chaveiro", { personalizavel: true });
    const op = await prisma.opcaoPersonalizacao.create({ data: { produtoId: produto.id, rotulo: "Nome", obrigatoria: true, maxCaracteres: 10 } });
    await expect(adicionarItem(null, { variacaoId: variacao.id, quantidade: 1 })).rejects.toThrow(/Preencha o campo "Nome"/);
    await expect(adicionarItem(null, { variacaoId: variacao.id, quantidade: 1, personalizacao: { [op.id]: "Nome muito comprido" } })).rejects.toThrow(/até 10/);
    const t = (await adicionarItem(null, { variacaoId: variacao.id, quantidade: 1, personalizacao: { [op.id]: "  Ana\n\t " } })).token!;
    await adicionarItem(t, { variacaoId: variacao.id, quantidade: 1, personalizacao: { [op.id]: "Ana", [op.id + "x"]: "ignorado" } }); // mesma pessoa => soma
    await adicionarItem(t, { variacaoId: variacao.id, quantidade: 1, personalizacao: { [op.id]: "Bia" } }); // outro nome => outra linha
    const c = await lerCarrinho(t);
    expect(c.linhas.map((l) => [l.quantidade, l.personalizacao[0].texto])).toEqual(expect.arrayContaining([[2, "Ana"], [1, "Bia"]]));
    expect(c.linhas).toHaveLength(2);
  });

  it("produto sem personalização ignora texto enviado; função de validação é segura", async () => {
    const { mk } = await loja();
    const { variacao } = await mk("Simples");
    const t = (await adicionarItem(null, { variacaoId: variacao.id, quantidade: 1, personalizacao: { qualquer: "coisa" } })).token!;
    expect((await prisma.itemCarrinho.findFirstOrThrow()).personalizacao).toBeNull();
    expect(t).toBeTruthy();
    expect(validarPersonalizacao([], "texto")).toEqual({});
    expect(validarPersonalizacao([{ id: "a", rotulo: "A", obrigatoria: false, maxCaracteres: 5 }], { a: "<b>" })).toEqual({ a: "<b>" }); // guardado como texto; a tela escapa
  });

  it("remove, e um token de outro carrinho nunca acessa itens alheios", async () => {
    const { mk } = await loja();
    const { variacao } = await mk("Vaso");
    const a = (await adicionarItem(null, { variacaoId: variacao.id, quantidade: 1 })).token!;
    const b = (await adicionarItem(null, { variacaoId: variacao.id, quantidade: 1 })).token!;
    const itemA = (await lerCarrinho(a)).linhas[0].itemId;
    await expect(removerItem(b, itemA)).rejects.toThrow(/não encontrado/);
    await expect(removerItem("token-invalido-aaaaaaaaaaaaaaaa", itemA)).rejects.toThrow(/expirou/);
    await expect(alterarQuantidade(b, itemA, 2)).rejects.toThrow();
    await removerItem(a, itemA);
    expect(await contarItens(a)).toBe(0);
    expect(await contarItens(b)).toBe(1);
    expect(await contarItens(null)).toBe(0);
    expect(await contarItens("curto")).toBe(0);
  });

  it("carrinho expirado vira vazio; o preço mudou => carrinho mostra o novo", async () => {
    const { mk } = await loja();
    const { produto, variacao } = await mk("Vaso");
    const t = (await adicionarItem(null, { variacaoId: variacao.id, quantidade: 1 })).token!;
    await prisma.produto.update({ where: { id: produto.id }, data: { precoCentavos: 6500 } });
    expect((await lerCarrinho(t)).subtotalCentavos).toBe(6500);
    await prisma.carrinho.updateMany({ data: { expiraEm: new Date(Date.now() - 1000) } });
    expect((await lerCarrinho(t)).linhas).toEqual([]);
    expect(await prisma.carrinho.count()).toBe(0);
  });

  it("sinaliza problemas (esgotou, despublicado), tira do total e ajusta quando pedido", async () => {
    const { mk } = await loja();
    const a = await mk("A", {}, { estoque: 5 });
    const b = await mk("B", {}, { estoque: 5 });
    const c = await mk("C", {}, { estoque: 5 });
    const t = (await adicionarItem(null, { variacaoId: a.variacao.id, quantidade: 4 })).token!;
    await adicionarItem(t, { variacaoId: b.variacao.id, quantidade: 1 });
    await adicionarItem(t, { variacaoId: c.variacao.id, quantidade: 1 });
    await prisma.variacao.update({ where: { id: a.variacao.id }, data: { estoque: 2 } }); // sobrou menos
    await prisma.variacao.update({ where: { id: b.variacao.id }, data: { estoque: 0 } }); // esgotou
    await prisma.produto.update({ where: { id: c.produto.id }, data: { ativo: false } }); // despublicado
    const cart = await lerCarrinho(t);
    const por = Object.fromEntries(cart.linhas.map((l) => [l.produto.nome, l]));
    expect(por["A"].problema).toMatch(/Só temos 2/);
    expect(por["B"].problema).toMatch(/Indisponível/);
    expect(por["C"].problema).toMatch(/Indisponível/);
    expect(cart.temProblemas).toBe(true);
    expect(cart.subtotalCentavos).toBe(0);
    expect(await ajustarCarrinho(t)).toBe(3);
    const depois = await lerCarrinho(t);
    expect(depois.linhas.map((l) => [l.produto.nome, l.quantidade])).toEqual([["A", 2]]);
    expect(depois.temProblemas).toBe(false);
    expect(depois.subtotalCentavos).toBe(10000);
  });

  it("prazo do carrinho = maior prazo entre os itens; sinaliza sob encomenda", async () => {
    const { mk } = await loja();
    const a = await mk("Pronto", { prazoPreparoDias: 1 });
    const b = await mk("Encomenda", { tipo: "SOB_ENCOMENDA", prazoPreparoDias: 5 }, { estoque: 0, prazoPreparoDias: 8 });
    const t = (await adicionarItem(null, { variacaoId: a.variacao.id, quantidade: 1 })).token!;
    await adicionarItem(t, { variacaoId: b.variacao.id, quantidade: 1 });
    const c = await lerCarrinho(t);
    expect(c.prazoPreparoDias).toBe(8);
    expect(c.temSobEncomenda).toBe(true);
  });
});
