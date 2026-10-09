import { afterAll, beforeEach, describe, expect, it } from "vitest";
import { seedBase } from "../prisma/seed-base";
import { criarProdutoBase, dadosEntrega, limparBanco, prisma } from "./helpers";

beforeEach(limparBanco);
afterAll(() => prisma.$disconnect());

describe("catálogo", () => {
  it("rejeita estoque negativo", async () => {
    const p = await criarProdutoBase();
    await expect(prisma.variacao.create({ data: { produtoId: p.id, sku: "A-1", estoque: -1 } })).rejects.toThrow();
  });

  it("rejeita SKU duplicado", async () => {
    const p = await criarProdutoBase();
    await prisma.variacao.create({ data: { produtoId: p.id, sku: "A-1" } });
    await expect(prisma.variacao.create({ data: { produtoId: p.id, sku: "A-1", tamanho: "G" } })).rejects.toThrow();
  });

  it("rejeita a mesma combinação produto + cor + tamanho, mesmo com valores nulos", async () => {
    const p = await criarProdutoBase();
    await prisma.variacao.create({ data: { produtoId: p.id, sku: "A-1" } });
    await expect(prisma.variacao.create({ data: { produtoId: p.id, sku: "A-2" } })).rejects.toThrow();
    const cor = await prisma.cor.create({ data: { slug: "preto", nome: "Preto" } });
    await prisma.variacao.create({ data: { produtoId: p.id, sku: "A-3", corId: cor.id } });
    await expect(prisma.variacao.create({ data: { produtoId: p.id, sku: "A-4", corId: cor.id } })).rejects.toThrow();
  });

  it("preço promocional precisa ser menor que o preço", async () => {
    await expect(criarProdutoBase({ precoPromocionalCentavos: 10000 })).rejects.toThrow();
    await expect(criarProdutoBase({ precoPromocionalCentavos: 9000 })).resolves.toBeTruthy();
  });

  it("produto novo nasce como rascunho (inativo)", async () => {
    expect((await criarProdutoBase()).ativo).toBe(false);
  });

  it("permite cadastrar nova cor sem alterar código", async () => {
    const cor = await prisma.cor.create({ data: { slug: "terracota", nome: "Terracota", hex: "#c1846f" } });
    expect(cor.ativa).toBe(true);
  });

  it("não apaga categoria que ainda tem produtos", async () => {
    const p = await criarProdutoBase();
    await expect(prisma.categoria.delete({ where: { id: p.categoriaId } })).rejects.toThrow();
  });
});

describe("pedidos", () => {
  const base = { email: "a@b.com", nome: "Cliente", aceitouTermosEm: new Date(), ...dadosEntrega };

  it("aceita total coerente e numera os pedidos em sequência", async () => {
    const a = await prisma.pedido.create({ data: { ...base, subtotalCentavos: 10000, descontoCentavos: 1000, freteCentavos: 2000, totalCentavos: 11000 } });
    const b = await prisma.pedido.create({ data: { ...base, subtotalCentavos: 500, totalCentavos: 500 } });
    expect(a.status).toBe("AGUARDANDO_PAGAMENTO");
    expect(b.numero).toBe(a.numero + 1);
  });

  it("rejeita total que não confere com subtotal − desconto + frete", async () => {
    await expect(prisma.pedido.create({ data: { ...base, subtotalCentavos: 10000, freteCentavos: 2000, totalCentavos: 10000 } })).rejects.toThrow();
  });

  it("rejeita desconto maior que o subtotal", async () => {
    await expect(prisma.pedido.create({ data: { ...base, subtotalCentavos: 1000, descontoCentavos: 2000, totalCentavos: 0 } })).rejects.toThrow();
  });

  it("o item do pedido mantém o snapshot quando a variação é excluída", async () => {
    const p = await criarProdutoBase();
    const v = await prisma.variacao.create({ data: { produtoId: p.id, sku: "SNAP-1" } });
    const pedido = await prisma.pedido.create({
      data: { ...base, subtotalCentavos: 10000, totalCentavos: 10000, itens: { create: { variacaoId: v.id, nomeProduto: "Produto de teste", sku: "SNAP-1", precoUnitarioCentavos: 10000, quantidade: 1 } } },
    });
    await prisma.variacao.delete({ where: { id: v.id } });
    const item = await prisma.itemPedido.findFirstOrThrow({ where: { pedidoId: pedido.id } });
    expect(item.variacaoId).toBeNull();
    expect(item.sku).toBe("SNAP-1");
    expect(item.precoUnitarioCentavos).toBe(10000);
  });

  it("rejeita quantidade zero", async () => {
    await expect(
      prisma.pedido.create({
        data: { ...base, subtotalCentavos: 0, totalCentavos: 0, itens: { create: { nomeProduto: "x", sku: "x", precoUnitarioCentavos: 1, quantidade: 0 } } },
      }),
    ).rejects.toThrow();
  });
});

describe("pagamentos e webhooks", () => {
  it("não registra duas vezes o mesmo pagamento do provedor", async () => {
    const pedido = await prisma.pedido.create({ data: { email: "a@b.com", nome: "C", aceitouTermosEm: new Date(), subtotalCentavos: 100, totalCentavos: 100, ...dadosEntrega } });
    const dados = { pedidoId: pedido.id, idExterno: "mp-123", metodo: "PIX" as const, valorCentavos: 100 };
    await prisma.pagamento.create({ data: dados });
    await expect(prisma.pagamento.create({ data: dados })).rejects.toThrow();
  });

  it("não processa o mesmo evento de webhook duas vezes", async () => {
    const evento = { provedor: "MERCADO_PAGO", idEvento: "evt-1", payload: { a: 1 } };
    await prisma.eventoWebhook.create({ data: evento });
    await expect(prisma.eventoWebhook.create({ data: evento })).rejects.toThrow();
    await expect(prisma.eventoWebhook.create({ data: { ...evento, provedor: "OUTRO" } })).resolves.toBeTruthy();
  });
});

describe("cupons e endereços", () => {
  it("exige código em maiúsculas e percentual entre 1 e 100", async () => {
    await expect(prisma.cupom.create({ data: { codigo: "bemvindo", tipo: "VALOR_FIXO", valor: 500 } })).rejects.toThrow();
    await expect(prisma.cupom.create({ data: { codigo: "BEMVINDO", tipo: "PERCENTUAL", valor: 150 } })).rejects.toThrow();
    await expect(prisma.cupom.create({ data: { codigo: "BEMVINDO", tipo: "PERCENTUAL", valor: 10 } })).resolves.toBeTruthy();
  });

  it("permite apenas um endereço padrão por usuário", async () => {
    const u = await prisma.usuario.create({ data: { email: "u@x.com" } });
    const end = { usuarioId: u.id, destinatario: "U", cep: "0", logradouro: "R", numero: "1", bairro: "B", cidade: "C", uf: "XX" };
    await prisma.endereco.create({ data: { ...end, padrao: true } });
    await expect(prisma.endereco.create({ data: { ...end, padrao: true } })).rejects.toThrow();
    await expect(prisma.endereco.create({ data: { ...end, padrao: false } })).resolves.toBeTruthy();
  });

  it("e-mail de usuário é único", async () => {
    await prisma.usuario.create({ data: { email: "u@x.com" } });
    await expect(prisma.usuario.create({ data: { email: "u@x.com" } })).rejects.toThrow();
  });

  it("não duplica o mesmo item (mesma variação e personalização) no carrinho", async () => {
    const p = await criarProdutoBase();
    const v = await prisma.variacao.create({ data: { produtoId: p.id, sku: "C-1" } });
    const c = await prisma.carrinho.create({ data: { tokenVisitante: "t1" } });
    await prisma.itemCarrinho.create({ data: { carrinhoId: c.id, variacaoId: v.id } });
    await expect(prisma.itemCarrinho.create({ data: { carrinhoId: c.id, variacaoId: v.id } })).rejects.toThrow();
  });
});

describe("seed", () => {
  it("é idempotente e não inventa produtos nem contatos", async () => {
    await seedBase(prisma);
    await seedBase(prisma);
    expect(await prisma.categoria.count()).toBe(7);
    expect(await prisma.cor.count()).toBe(11);
    expect(await prisma.produto.count()).toBe(0);
    expect(await prisma.pedido.count()).toBe(0);
    const whats = await prisma.configuracao.findUniqueOrThrow({ where: { chave: "contato.whatsapp" } });
    expect(whats.valor).toBeNull();
    expect(await prisma.paginaInstitucional.count({ where: { publicada: true } })).toBe(0);
  });
});
