import { randomUUID } from "node:crypto";
import { afterAll, beforeEach, describe, expect, it, vi } from "vitest";
import { adicionarItem, lerCarrinho } from "../src/server/carrinho";
import { aplicarStatusPagamento, cancelarExpirados, cotarCarrinho, criarPedido, localizarPedido, obterPedidoPublico, type EntradaCheckout } from "../src/server/checkout";
import { caixaDeSaida, transporteDeConsole } from "../src/server/email";
import { freteSimulado } from "../src/server/frete/simulado";
import { ErroPagamento, type ConsultaPagamento, type ProvedorPagamento, type ResultadoPagamento } from "../src/server/pagamentos/tipos";
import { alterarStatusPedido } from "../src/server/pedidos";
import { limparBanco, prisma } from "./helpers";

beforeEach(async () => { await limparBanco(); caixaDeSaida.length = 0; });
afterAll(() => prisma.$disconnect());

type Cartao = Partial<ResultadoPagamento> | Error;
function pagamentoFalso(cartao: Cartao = { status: "APROVADO", detalhe: "accredited" }) {
  const criarPix = vi.fn(async (p: { numero: number }, expiraEm: Date): Promise<ResultadoPagamento> => ({ idExterno: `pix-${randomUUID()}`, status: "PENDENTE", detalhe: "pending_waiting_transfer", pix: { copiaECola: `0002-PIX-${p.numero}`, qrBase64: "QR64", ticketUrl: null, expiraEm } }));
  const criarCartao = vi.fn(async (...args: unknown[]): Promise<ResultadoPagamento> => { void args; if (cartao instanceof Error) throw cartao; return { idExterno: `card-${randomUUID()}`, status: "PENDENTE", detalhe: null, ...cartao }; });
  const prov: ProvedorPagamento = { nome: "falso", criarPix, criarCartao, consultar: vi.fn() };
  return { prov, criarPix, criarCartao };
}
const deps = (pagamento: ProvedorPagamento | null, extra = {}) => ({ frete: freteSimulado, pagamento, email: transporteDeConsole, urlBase: "https://loja.exemplo", ...extra });

async function loja(opcoes: { estoque?: number; tipo?: "PRONTA_ENTREGA" | "SOB_ENCOMENDA"; embalagem?: boolean; preco?: number } = {}) {
  await prisma.configuracao.create({ data: { chave: "frete.cepOrigem", valor: "01001000" } });
  const cat = await prisma.categoria.create({ data: { slug: "c", nome: "C" } });
  const embalagem = opcoes.embalagem === false ? {} : { pesoEmbalagemG: 300, compEmbalagemMm: 200, largEmbalagemMm: 150, altEmbalagemMm: 100 };
  const produto = await prisma.produto.create({
    data: { slug: "vaso", nome: "Vaso", precoCentavos: opcoes.preco ?? 5000, categoriaId: cat.id, ativo: true, tipo: opcoes.tipo ?? "PRONTA_ENTREGA", prazoPreparoDias: 2, ...embalagem,
      variacoes: { create: { sku: "VASO-1", estoque: opcoes.estoque ?? 5 } }, imagens: { create: { url: "/media/a.png", alt: "Vaso" } } },
    include: { variacoes: true },
  });
  return { produto, variacao: produto.variacoes[0] };
}
const carrinho = async (variacaoId: string, quantidade = 1) => (await adicionarItem(null, { variacaoId, quantidade })).token!;
const entrada = (extra: Partial<EntradaCheckout> = {}): EntradaCheckout => ({
  contato: { email: "Ana@Exemplo.com", nome: "Ana Souza", telefone: "(11) 99999-0000", cpf: "529.982.247-25" },
  entrega: { destinatario: "Ana Souza", cep: "01001-000", logradouro: "Praça da Sé", numero: "10", bairro: "Sé", cidade: "São Paulo", uf: "sp" },
  freteId: "simulado:pac", pagamento: { metodo: "PIX" }, aceitouTermos: true, chaveIdempotencia: randomUUID(), ...extra,
});
const estoque = async (id: string) => (await prisma.variacao.findUniqueOrThrow({ where: { id } })).estoque;

describe("criar pedido (Pix)", () => {
  it("fecha o pedido com valores do SERVIDOR, reserva estoque, guarda cópia dos dados e esvazia o carrinho", async () => {
    const { variacao } = await loja();
    const t = await carrinho(variacao.id, 2);
    const { prov, criarPix } = pagamentoFalso();
    const r = await criarPedido(entrada(), t, null, deps(prov));
    expect(r).toMatchObject({ pago: false, repetido: false });
    const p = await prisma.pedido.findUniqueOrThrow({ where: { numero: r.numero }, include: { itens: true, pagamentos: true, historico: true } });
    expect(p).toMatchObject({ status: "AGUARDANDO_PAGAMENTO", subtotalCentavos: 10000, descontoCentavos: 0, freteCentavos: 1700, totalCentavos: 11700, email: "ana@exemplo.com", clienteDocumento: "52998224725", entregaCep: "01001000", entregaUf: "SP", freteServicoId: "simulado:pac", fretePrazoDias: 7, prazoPreparoDias: 2 });
    expect(p.itens[0]).toMatchObject({ nomeProduto: "Vaso", sku: "VASO-1", quantidade: 2, precoUnitarioCentavos: 5000, reservouEstoque: true });
    expect(p.pagamentos[0]).toMatchObject({ metodo: "PIX", status: "PENDENTE", valorCentavos: 11700, pixCopiaECola: `0002-PIX-${r.numero}`, pixQrBase64: "QR64" });
    expect(p.expiraEm!.getTime()).toBeGreaterThan(Date.now() + 50 * 60_000);
    expect(p.historico).toHaveLength(1);
    expect(await estoque(variacao.id)).toBe(3);
    expect((await lerCarrinho(t)).linhas).toHaveLength(0);
    expect(criarPix.mock.calls[0][0]).toMatchObject({ valorCentavos: 11700, pagador: { cpf: "52998224725" }, urlNotificacao: "https://loja.exemplo/api/webhooks/mercadopago" });
    expect(caixaDeSaida.map((e) => e.assunto)).toEqual([`Recebemos seu pedido #${r.numero}`]);
  });

  it("preço mudou depois do carrinho: o pedido usa o preço atual; frete inexistente é recusado", async () => {
    const { produto, variacao } = await loja();
    const t = await carrinho(variacao.id);
    await prisma.produto.update({ where: { id: produto.id }, data: { precoCentavos: 6000 } });
    const { prov } = pagamentoFalso();
    await expect(criarPedido(entrada({ freteId: "simulado:inventado" }), t, null, deps(prov))).rejects.toThrow(/não está mais disponível/);
    expect(await estoque(variacao.id)).toBe(5); // nada foi reservado
    const r = await criarPedido(entrada(), t, null, deps(prov));
    expect((await prisma.pedido.findUniqueOrThrow({ where: { numero: r.numero } })).subtotalCentavos).toBe(6000);
  });

  it("clique duplo (mesma chave) devolve o mesmo pedido, cobra e reserva uma vez só", async () => {
    const { variacao } = await loja();
    const t = await carrinho(variacao.id);
    const { prov, criarPix } = pagamentoFalso();
    const e = entrada();
    const [a, b] = await Promise.all([criarPedido(e, t, null, deps(prov)), criarPedido(e, t, null, deps(prov))].map((p) => p.catch((x) => x)));
    const c = await criarPedido(e, t, null, deps(prov));
    expect(c.repetido).toBe(true);
    expect([a, b].filter((x) => x instanceof Error).length).toBeLessThanOrEqual(1);
    expect(await prisma.pedido.count()).toBe(1);
    expect(await estoque(variacao.id)).toBe(4);
    expect(criarPix).toHaveBeenCalledTimes(1);
  });

  it("duas pessoas na última unidade: só uma compra, estoque nunca fica negativo", async () => {
    const { variacao } = await loja({ estoque: 1 });
    const t1 = await carrinho(variacao.id), t2 = await carrinho(variacao.id);
    const { prov } = pagamentoFalso();
    const r = await Promise.allSettled([criarPedido(entrada(), t1, null, deps(prov)), criarPedido(entrada(), t2, null, deps(prov))]);
    expect(r.filter((x) => x.status === "fulfilled")).toHaveLength(1);
    expect(r.find((x) => x.status === "rejected")).toMatchObject({ reason: { message: expect.stringMatching(/esgotar|indispon/) } });
    expect(await estoque(variacao.id)).toBe(0);
    expect(await prisma.pedido.count()).toBe(1);
  });

  it("sob encomenda não baixa estoque; produto sem embalagem não fecha (frete impossível)", async () => {
    const enc = await loja({ tipo: "SOB_ENCOMENDA", estoque: 0 });
    const { prov } = pagamentoFalso();
    const r = await criarPedido(entrada(), await carrinho(enc.variacao.id, 2), null, deps(prov));
    expect((await prisma.itemPedido.findFirstOrThrow({ where: { pedido: { numero: r.numero } } })).reservouEstoque).toBe(false);
    expect(await estoque(enc.variacao.id)).toBe(0);
    await limparBanco();
    const sem = await loja({ embalagem: false });
    await expect(criarPedido(entrada(), await carrinho(sem.variacao.id), null, deps(prov))).rejects.toThrow(/calcular o frete/);
    expect(await estoque(sem.variacao.id)).toBe(5);
  });

  it("recusa dados inválidos e serviços indisponíveis sem tocar no estoque", async () => {
    const { variacao } = await loja();
    const t = await carrinho(variacao.id);
    const { prov } = pagamentoFalso();
    for (const ruim of [entrada({ contato: { ...entrada().contato, cpf: "111.111.111-11" } }), entrada({ aceitouTermos: false as unknown as true }), entrada({ entrega: { ...entrada().entrega, uf: "XX" } }), entrada({ entrega: { ...entrada().entrega, cep: "123" } }), entrada({ chaveIdempotencia: "curta" }), entrada({ contato: { ...entrada().contato, email: "sem-arroba" } })])
      await expect(criarPedido(ruim, t, null, deps(prov))).rejects.toThrow();
    await expect(criarPedido(entrada(), t, null, deps(null))).rejects.toThrow(/pagamento online/);
    await expect(criarPedido(entrada(), t, null, { ...deps(prov), frete: null })).rejects.toThrow(/frete/i);
    await expect(criarPedido(entrada(), null, null, deps(prov))).rejects.toThrow(/vazio/);
    expect(await estoque(variacao.id)).toBe(5);
    expect(await prisma.pedido.count()).toBe(0);
  });
});

describe("cartão", () => {
  it("aprovado na hora: pedido já entra como pagamento aprovado e avisa o cliente", async () => {
    const { variacao } = await loja();
    const { prov, criarCartao } = pagamentoFalso({ status: "APROVADO" });
    const r = await criarPedido(entrada({ pagamento: { metodo: "CARTAO", token: "tok_123456", metodoId: "visa", emissorId: "24", parcelas: 3 } }), await carrinho(variacao.id), null, deps(prov));
    expect(r.pago).toBe(true);
    const p = await prisma.pedido.findUniqueOrThrow({ where: { numero: r.numero }, include: { pagamentos: true, historico: { orderBy: { criadoEm: "asc" } } } });
    expect(p.status).toBe("PAGAMENTO_APROVADO");
    expect(p.pagamentos[0]).toMatchObject({ metodo: "CARTAO", status: "APROVADO", parcelas: 3 });
    expect(p.historico.map((h) => h.para)).toEqual(["AGUARDANDO_PAGAMENTO", "PAGAMENTO_APROVADO"]);
    expect(criarCartao.mock.calls[0][1]).toMatchObject({ token: "tok_123456", parcelas: 3 });
    expect(caixaDeSaida.map((e) => e.assunto)).toEqual([`Recebemos seu pedido #${r.numero}`, `Pagamento aprovado — pedido #${r.numero}`]);
  });

  it("recusado: mensagem clara, pedido cancelado, estoque e cupom devolvidos, carrinho preservado", async () => {
    const { variacao } = await loja();
    await prisma.cupom.create({ data: { codigo: "BEM10", tipo: "PERCENTUAL", valor: 10, usoMaximo: 5 } });
    const t = await carrinho(variacao.id, 2);
    const { prov } = pagamentoFalso({ status: "RECUSADO", detalhe: "cc_rejected_insufficient_amount" });
    await expect(criarPedido(entrada({ cupom: "bem10", pagamento: { metodo: "CARTAO", token: "tok_123456", metodoId: "visa", parcelas: 1 } }), t, null, deps(prov))).rejects.toThrow(/Saldo ou limite insuficiente/);
    const p = await prisma.pedido.findFirstOrThrow({ include: { pagamentos: true } });
    expect(p.status).toBe("CANCELADO");
    expect(p.pagamentos[0].status).toBe("CANCELADO");
    expect(await estoque(variacao.id)).toBe(5);
    expect((await prisma.cupom.findUniqueOrThrow({ where: { codigo: "BEM10" } })).usos).toBe(0);
    expect((await lerCarrinho(t)).linhas).toHaveLength(1);
  });

  it("falha do provedor: cancela, devolve estoque e mostra mensagem amigável", async () => {
    const { variacao } = await loja();
    const t = await carrinho(variacao.id);
    const { prov } = pagamentoFalso(new ErroPagamento("O serviço de pagamento está instável. Tente novamente em instantes."));
    await expect(criarPedido(entrada({ pagamento: { metodo: "CARTAO", token: "tok_123456", metodoId: "visa", parcelas: 1 } }), t, null, deps(prov))).rejects.toThrow(/instável/);
    expect((await prisma.pedido.findFirstOrThrow()).status).toBe("CANCELADO");
    expect(await estoque(variacao.id)).toBe(5);
    expect((await lerCarrinho(t)).linhas).toHaveLength(1);
  });
});

describe("cupons e frete grátis", () => {
  it("percentual reduz o subtotal; consome uso; limite vale mesmo com compras simultâneas", async () => {
    const { variacao } = await loja({ estoque: 10 });
    await prisma.cupom.create({ data: { codigo: "UNICO", tipo: "PERCENTUAL", valor: 20, usoMaximo: 1 } });
    const { prov } = pagamentoFalso();
    const [t1, t2] = [await carrinho(variacao.id), await carrinho(variacao.id)];
    const r = await Promise.allSettled([criarPedido(entrada({ cupom: "unico" }), t1, null, deps(prov)), criarPedido(entrada({ cupom: "UNICO" }), t2, null, deps(prov))]);
    expect(r.filter((x) => x.status === "fulfilled")).toHaveLength(1);
    const p = await prisma.pedido.findFirstOrThrow();
    expect(p).toMatchObject({ subtotalCentavos: 5000, descontoCentavos: 1000, freteCentavos: 1600, totalCentavos: 5600, cupomCodigo: "UNICO" });
    expect((await prisma.cupom.findUniqueOrThrow({ where: { codigo: "UNICO" } })).usos).toBe(1);
    expect(await estoque(variacao.id)).toBe(9); // a compra que perdeu o cupom não segurou estoque
  });

  it("valida cupom: inexistente, vencido, inativo, mínimo e esgotado", async () => {
    const { variacao } = await loja();
    const t = await carrinho(variacao.id);
    const agora = new Date();
    await prisma.cupom.createMany({ data: [
      { codigo: "VENCIDO", tipo: "VALOR_FIXO", valor: 500, fimEm: new Date(agora.getTime() - 1000) }, { codigo: "FUTURO", tipo: "VALOR_FIXO", valor: 500, inicioEm: new Date(agora.getTime() + 86400000) },
      { codigo: "INATIVO", tipo: "VALOR_FIXO", valor: 500, ativo: false }, { codigo: "MINIMO", tipo: "VALOR_FIXO", valor: 500, minimoCentavos: 20000 }, { codigo: "ACABOU", tipo: "VALOR_FIXO", valor: 500, usoMaximo: 1, usos: 1 },
    ] });
    for (const [c, msg] of [["NAOEXISTE", /não encontrado ou expirado/], ["VENCIDO", /não encontrado ou expirado/], ["FUTURO", /não encontrado ou expirado/], ["INATIVO", /não encontrado ou expirado/], ["MINIMO", /a partir de R\$\s?200,00/], ["ACABOU", /limite de usos/], ["a b", /não encontrado/]] as const)
      await expect(cotarCarrinho(t, { cep: "01001000", cupom: c }, deps(null))).rejects.toThrow(msg);
  });

  it("valor fixo não passa do subtotal; cupom de frete grátis zera a opção mais barata", async () => {
    const { variacao } = await loja();
    const t = await carrinho(variacao.id);
    await prisma.cupom.createMany({ data: [{ codigo: "GRANDE", tipo: "VALOR_FIXO", valor: 99999 }, { codigo: "FRETE", tipo: "FRETE_GRATIS" }] });
    const a = (await cotarCarrinho(t, { cep: "01001000", cupom: "GRANDE" }, deps(null))).cotacao;
    expect(a.descontoCentavos).toBe(5000);
    const b = (await cotarCarrinho(t, { cep: "01001000", cupom: "FRETE" }, deps(null))).cotacao;
    expect(b.opcoes.map((o) => [o.id, o.precoCentavos, o.gratis])).toEqual([["simulado:pac", 0, true], ["simulado:sedex", 1350, false]]);
  });

  it("frete grátis por valor mínimo configurado no painel", async () => {
    const { variacao } = await loja({ preco: 20000 });
    await prisma.configuracao.create({ data: { chave: "frete.gratisAPartirDeCentavos", valor: 30000 } });
    const abaixo = (await cotarCarrinho(await carrinho(variacao.id), { cep: "01001000" }, deps(null))).cotacao;
    expect(abaixo.opcoes[0].precoCentavos).toBe(1600);
    const atinge = (await cotarCarrinho(await carrinho(variacao.id, 2), { cep: "01001000" }, deps(null))).cotacao;
    expect(atinge.opcoes[0]).toMatchObject({ precoCentavos: 0, gratis: true });
  });
});

describe("confirmação de pagamento (webhook)", () => {
  async function pedidoPix() {
    const { variacao } = await loja();
    const { prov } = pagamentoFalso();
    const r = await criarPedido(entrada(), await carrinho(variacao.id), null, deps(prov));
    const p = await prisma.pedido.findUniqueOrThrow({ where: { numero: r.numero }, include: { pagamentos: true } });
    const consulta = (extra: Partial<ConsultaPagamento> = {}): ConsultaPagamento => ({ idExterno: p.pagamentos[0].idExterno!, status: "APROVADO", detalhe: "accredited", valorCentavos: p.totalCentavos, moeda: "BRL", referenciaExterna: p.id, metodo: "PIX", ...extra });
    return { p, variacao, consulta, d: deps(prov) };
  }

  it("aprova uma vez só, mesmo com notificações repetidas ou simultâneas", async () => {
    const { p, consulta, d } = await pedidoPix();
    caixaDeSaida.length = 0;
    const r = await Promise.all([1, 2, 3].map(() => aplicarStatusPagamento(consulta(), "FALSO", d)));
    expect(r.every((x) => x === "aplicado")).toBe(true);
    const depois = await prisma.pedido.findUniqueOrThrow({ where: { id: p.id }, include: { historico: true, pagamentos: true } });
    expect(depois.status).toBe("PAGAMENTO_APROVADO");
    expect(depois.historico.filter((h) => h.para === "PAGAMENTO_APROVADO")).toHaveLength(1);
    expect(depois.pagamentos[0].status).toBe("APROVADO");
    expect(caixaDeSaida.map((e) => e.assunto)).toEqual([`Pagamento aprovado — pedido #${p.numero}`]);
  });

  it("não aprova valor, moeda ou referência divergentes (fica registrado)", async () => {
    const { p, consulta, d } = await pedidoPix();
    for (const c of [consulta({ valorCentavos: 100 }), consulta({ moeda: "USD" }), consulta({ referenciaExterna: "outro-pedido" })]) expect(await aplicarStatusPagamento(c, "FALSO", d)).toBe("divergente");
    expect((await prisma.pedido.findUniqueOrThrow({ where: { id: p.id } })).status).toBe("AGUARDANDO_PAGAMENTO");
    expect(await prisma.logAuditoria.count({ where: { acao: "pagamento-divergente" } })).toBe(3);
  });

  it("ignora pagamento desconhecido e status pendente; recupera pagamento sem registro pela referência", async () => {
    const { p, consulta, d } = await pedidoPix();
    expect(await aplicarStatusPagamento(consulta({ idExterno: "999", referenciaExterna: null }), "FALSO", d)).toBe("ignorado");
    expect(await aplicarStatusPagamento(consulta({ status: "PENDENTE" }), "FALSO", d)).toBe("ignorado");
    expect(await aplicarStatusPagamento(consulta({ idExterno: "novo-id-sem-registro" }), "FALSO", d)).toBe("aplicado");
    expect((await prisma.pedido.findUniqueOrThrow({ where: { id: p.id } })).status).toBe("PAGAMENTO_APROVADO");
    expect(await prisma.pagamento.count({ where: { pedidoId: p.id } })).toBe(2);
  });

  it("pagamento recusado/cancelado cancela o pedido e devolve o estoque", async () => {
    const { p, variacao, consulta, d } = await pedidoPix();
    expect(await estoque(variacao.id)).toBe(4);
    await aplicarStatusPagamento(consulta({ status: "CANCELADO", detalhe: "expired" }), "FALSO", d);
    expect((await prisma.pedido.findUniqueOrThrow({ where: { id: p.id } })).status).toBe("CANCELADO");
    expect(await estoque(variacao.id)).toBe(5);
  });

  it("pagamento que chega DEPOIS de o pedido expirar não reabre o pedido e fica sinalizado", async () => {
    const { p, variacao, consulta, d } = await pedidoPix();
    await prisma.pedido.update({ where: { id: p.id }, data: { expiraEm: new Date(Date.now() - 1000) } });
    expect(await cancelarExpirados(d)).toBe(1);
    expect(await estoque(variacao.id)).toBe(5);
    await aplicarStatusPagamento(consulta(), "FALSO", d);
    expect((await prisma.pedido.findUniqueOrThrow({ where: { id: p.id } })).status).toBe("CANCELADO");
    expect(await estoque(variacao.id)).toBe(5);
    expect(await prisma.logAuditoria.count({ where: { acao: "pagamento-apos-cancelamento", entidadeId: p.id } })).toBe(1);
  });
});

describe("expiração e cancelamento", () => {
  it("cancela só pedidos vencidos e não pagos; devolve estoque uma única vez; avisa o cliente", async () => {
    const { variacao } = await loja({ estoque: 10 });
    const { prov } = pagamentoFalso();
    const a = await criarPedido(entrada(), await carrinho(variacao.id, 2), null, deps(prov));
    const b = await criarPedido(entrada(), await carrinho(variacao.id, 1), null, deps(prov));
    expect(await estoque(variacao.id)).toBe(7);
    await prisma.pedido.update({ where: { numero: a.numero }, data: { expiraEm: new Date(Date.now() - 1000) } });
    caixaDeSaida.length = 0;
    expect(await cancelarExpirados(deps(prov))).toBe(1);
    expect(await cancelarExpirados(deps(prov))).toBe(0);
    expect(await estoque(variacao.id)).toBe(9);
    expect((await prisma.pedido.findUniqueOrThrow({ where: { numero: b.numero } })).status).toBe("AGUARDANDO_PAGAMENTO");
    expect(caixaDeSaida.map((e) => e.assunto)).toEqual([`Pedido #${a.numero} cancelado`]);
  });

  it("cancelar pelo painel um pedido já pago devolve estoque e cupom, sem duplicar", async () => {
    const { variacao } = await loja();
    await prisma.cupom.create({ data: { codigo: "BEM10", tipo: "PERCENTUAL", valor: 10 } });
    const admin = await prisma.usuario.create({ data: { email: "a@a.com", papel: "ADMIN" } });
    const { prov } = pagamentoFalso({ status: "APROVADO" });
    const r = await criarPedido(entrada({ cupom: "BEM10", pagamento: { metodo: "CARTAO", token: "tok_123456", metodoId: "visa", parcelas: 1 } }), await carrinho(variacao.id, 2), null, deps(prov));
    const p = await prisma.pedido.findUniqueOrThrow({ where: { numero: r.numero } });
    expect(await estoque(variacao.id)).toBe(3);
    await alterarStatusPedido(p.id, "CANCELADO", admin.id, { nota: "Cliente desistiu" }, transporteDeConsole);
    expect(await estoque(variacao.id)).toBe(5);
    expect((await prisma.cupom.findUniqueOrThrow({ where: { codigo: "BEM10" } })).usos).toBe(0);
    await expect(alterarStatusPedido(p.id, "CANCELADO", admin.id, {}, transporteDeConsole)).rejects.toThrow(/Não é possível/);
    expect(await estoque(variacao.id)).toBe(5);
  });
});

describe("acesso ao pedido", () => {
  it("o código do link libera o pedido; código errado, outro cliente ou número inválido não", async () => {
    const { variacao } = await loja();
    const dono = await prisma.usuario.create({ data: { email: "dono@x.com" } });
    const outro = await prisma.usuario.create({ data: { email: "outro@x.com" } });
    const { prov } = pagamentoFalso();
    const r = await criarPedido(entrada(), await carrinho(variacao.id), dono.id, deps(prov));
    expect((await obterPedidoPublico(r.numero, { codigo: r.tokenAcesso }))?.numero).toBe(r.numero);
    expect(await obterPedidoPublico(r.numero, { codigo: "errado" })).toBeNull();
    expect(await obterPedidoPublico(r.numero, { codigo: r.tokenAcesso.slice(0, -1) })).toBeNull();
    expect(await obterPedidoPublico(r.numero, {})).toBeNull();
    expect((await obterPedidoPublico(r.numero, { usuarioId: dono.id }))?.numero).toBe(r.numero);
    expect(await obterPedidoPublico(r.numero, { usuarioId: outro.id })).toBeNull();
    expect(await obterPedidoPublico(0, { codigo: r.tokenAcesso })).toBeNull();
    expect(await obterPedidoPublico(1.5, { codigo: r.tokenAcesso })).toBeNull();
  });

  it("acompanhamento por número + e-mail", async () => {
    const { variacao } = await loja();
    const { prov } = pagamentoFalso();
    const r = await criarPedido(entrada(), await carrinho(variacao.id), null, deps(prov));
    expect((await localizarPedido(r.numero, " ANA@exemplo.com ")).tokenAcesso).toBe(r.tokenAcesso);
    await expect(localizarPedido(r.numero, "outro@x.com")).rejects.toThrow(/Não encontramos/);
    await expect(localizarPedido(99999, "ana@exemplo.com")).rejects.toThrow(/Não encontramos/);
  });
});
