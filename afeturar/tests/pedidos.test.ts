import { afterAll, beforeEach, describe, expect, it } from "vitest";
import type { StatusPedido } from "../src/generated/prisma/client";
import { configuracoesSchema } from "../src/server/validacao";
import { lerConfiguracoes, salvarConfiguracoes } from "../src/server/configuracoes";
import { indicadores } from "../src/server/painel";
import { alterarStatusPedido, listarPedidos, salvarRastreio, TRANSICOES } from "../src/server/pedidos";
import { dadosEntrega, limparBanco, prisma } from "./helpers";

beforeEach(limparBanco);
afterAll(() => prisma.$disconnect());

const novoPedido = (total: number, status: StatusPedido = "AGUARDANDO_PAGAMENTO", itens: { nome: string; q: number }[] = []) =>
  prisma.pedido.create({
    data: { email: "c@c.com", nome: "Cliente", aceitouTermosEm: new Date(), subtotalCentavos: total, totalCentavos: total, status, ...dadosEntrega,
      itens: { create: itens.map((i) => ({ nomeProduto: i.nome, sku: i.nome, precoUnitarioCentavos: 100, quantidade: i.q })) } },
  });

describe("status de pedidos", () => {
  it("segue o fluxo completo registrando o histórico", async () => {
    const autor = await prisma.usuario.create({ data: { email: "a@a.com", papel: "ADMIN" } });
    const p = await novoPedido(1000);
    await alterarStatusPedido(p.id, "PAGAMENTO_APROVADO", autor.id, { nota: "Pix conferido no banco" });
    await alterarStatusPedido(p.id, "EM_PREPARACAO", autor.id);
    await alterarStatusPedido(p.id, "PRONTO_PARA_ENVIO", autor.id);
    await alterarStatusPedido(p.id, "ENVIADO", autor.id, { codigoRastreio: "aa123456789br" });
    await alterarStatusPedido(p.id, "ENTREGUE", autor.id);
    const final = await prisma.pedido.findUniqueOrThrow({ where: { id: p.id } });
    expect(final.status).toBe("ENTREGUE");
    expect(final.codigoRastreio).toBe("aa123456789br");
    expect(final.enviadoEm).not.toBeNull();
    expect(final.entregueEm).not.toBeNull();
    expect(await prisma.historicoStatusPedido.count({ where: { pedidoId: p.id } })).toBe(5);
  });

  it("recusa saltos e saídas de estados finais", async () => {
    const autor = await prisma.usuario.create({ data: { email: "a@a.com", papel: "ADMIN" } });
    const p = await novoPedido(1000);
    await expect(alterarStatusPedido(p.id, "ENVIADO", autor.id)).rejects.toThrow(/Não é possível/);
    await alterarStatusPedido(p.id, "CANCELADO", autor.id);
    await expect(alterarStatusPedido(p.id, "EM_PREPARACAO", autor.id)).rejects.toThrow();
    expect(TRANSICOES.ENTREGUE).toEqual([]);
  });

  it("exige rastreio para enviar e observação para aprovar pagamento à mão", async () => {
    const autor = await prisma.usuario.create({ data: { email: "a@a.com", papel: "ADMIN" } });
    const aguardando = await novoPedido(1000);
    await expect(alterarStatusPedido(aguardando.id, "PAGAMENTO_APROVADO", autor.id)).rejects.toThrow(/observação/);
    const pronto = await novoPedido(1000, "PRONTO_PARA_ENVIO");
    await expect(alterarStatusPedido(pronto.id, "ENVIADO", autor.id)).rejects.toThrow(/rastreio/);
    await expect(salvarRastreio(pronto.id, "x", autor.id)).rejects.toThrow(/inválido/);
    await salvarRastreio(pronto.id, "ab123456789cd", autor.id);
    await expect(alterarStatusPedido(pronto.id, "ENVIADO", autor.id)).resolves.toBeUndefined();
  });

  it("filtra por status e busca por número, nome ou e-mail", async () => {
    await novoPedido(1000);
    const b = await novoPedido(2000, "ENVIADO");
    expect((await listarPedidos({ status: "ENVIADO" })).total).toBe(1);
    expect((await listarPedidos({ busca: String(b.numero) })).total).toBe(1);
    expect((await listarPedidos({ busca: "cliente" })).total).toBe(2);
    expect((await listarPedidos({ busca: "nada" })).total).toBe(0);
  });
});

describe("indicadores", () => {
  it("zerados quando não há pedidos", async () => {
    const i = await indicadores();
    expect(i).toMatchObject({ faturamentoCentavos: 0, totalPedidos: 0, ticketMedioCentavos: 0, maisVendidos: [] });
  });

  it("faturamento ignora pedidos aguardando e cancelados; ticket médio e mais vendidos corretos", async () => {
    await novoPedido(1000, "AGUARDANDO_PAGAMENTO", [{ nome: "Vaso", q: 5 }]);
    await novoPedido(9000, "CANCELADO", [{ nome: "Vaso", q: 5 }]);
    await novoPedido(1000, "PAGAMENTO_APROVADO", [{ nome: "Vaso", q: 2 }]);
    await novoPedido(3000, "ENTREGUE", [{ nome: "Vaso", q: 1 }, { nome: "Bandeja", q: 4 }]);
    const i = await indicadores();
    expect(i.faturamentoCentavos).toBe(4000);
    expect(i.ticketMedioCentavos).toBe(2000);
    expect(i.totalPedidos).toBe(4);
    expect(i.porStatus.CANCELADO).toBe(1);
    expect(i.maisVendidos[0]).toEqual({ nome: "Bandeja", quantidade: 4 });
    expect(i.maisVendidos[1]).toEqual({ nome: "Vaso", quantidade: 3 });
  });
});

describe("configurações da loja", () => {
  it("grava só quando tudo é válido e devolve erros por campo", async () => {
    const autor = await prisma.usuario.create({ data: { email: "a@a.com", papel: "ADMIN" } });
    const base = Object.fromEntries(Object.keys(configuracoesSchema.shape).map((k) => [k, null]));
    const ruim = await salvarConfiguracoes({ ...base, "contato.whatsapp": "11999990000", "empresa.cnpj": "123", "redes.instagram": "http://insta.com/x" }, autor.id);
    expect(ruim.ok).toBe(false);
    if (!ruim.ok) expect(Object.keys(ruim.erros).sort()).toEqual(["contato.whatsapp", "empresa.cnpj", "redes.instagram"]);
    expect(await prisma.configuracao.count()).toBe(0);

    const boa = await salvarConfiguracoes({ ...base, "contato.whatsapp": "5511999990000", "empresa.cnpj": "11222333000181", "redes.instagram": "https://www.instagram.com/afeturar", "frete.cepOrigem": "01001000", "frete.gratisAPartirDeCentavos": 29900, "contato.email": "" }, autor.id);
    expect(boa.ok).toBe(true);
    const lidas = await lerConfiguracoes();
    expect(lidas["contato.whatsapp"]).toBe("5511999990000");
    expect(lidas["contato.email"]).toBeNull();
    expect(lidas["frete.gratisAPartirDeCentavos"]).toBe(29900);
  });
});
