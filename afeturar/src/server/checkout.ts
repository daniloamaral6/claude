import { timingSafeEqual } from "node:crypto";
import { z } from "zod";
import type { Prisma, StatusPagamento } from "@/generated/prisma/client";
import { db } from "@/lib/db";
import { cepValido, cpfValido, emailValido, somenteDigitos, telefoneValido, UFS } from "@/lib/validacoes";
import { registrarAuditoria } from "./auditoria";
import { lerCarrinho, type Carrinho, type LinhaCarrinho } from "./carrinho";
import { ErroNegocio } from "./categorias";
import { lerConfiguracoes } from "./configuracoes";
import { consumirCupom, validarCupom, type CupomAplicado } from "./cupons";
import { enviarEmailSeguro, transporteDeEmail, type TransporteEmail } from "./email";
import { emailPagamentoAprovado, emailPedidoCancelado, emailPedidoRecebido, type PedidoEmail } from "./email/modelos";
import { provedorDeFrete } from "./frete";
import { aplicarFreteGratis, type OpcaoFreteFinal } from "./frete/regras";
import { ErroFrete, type PacoteItem, type ProvedorFrete } from "./frete/tipos";
import { provedorDePagamento } from "./pagamentos";
import { ErroPagamento, type ConsultaPagamento, type ProvedorPagamento, type ResultadoPagamento } from "./pagamentos/tipos";
import { liberarReservas, travarPedido } from "./reservas";

const nomeProvedor = (n: string) => n.toUpperCase();
export const VALIDADE_PEDIDO_MIN = 60; // pedido sem pagamento expira (e o estoque volta) depois disso

export interface Dependencias {
  frete?: ProvedorFrete | null; pagamento?: ProvedorPagamento | null; email?: TransporteEmail | null;
  agora?: Date; urlBase?: string;
}
const dep = (d: Dependencias) => ({
  frete: d.frete === undefined ? provedorDeFrete() : d.frete, pagamento: d.pagamento === undefined ? provedorDePagamento() : d.pagamento,
  email: d.email === undefined ? transporteDeEmail() : d.email, agora: d.agora ?? new Date(), urlBase: d.urlBase ?? process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000",
});

// ───────────────────────── frete ─────────────────────────

/** Embalagem de cada item do carrinho. Produto sem peso/medidas de embalagem não permite cotar o frete. */
export async function pacotesDoCarrinho(cart: Carrinho): Promise<PacoteItem[]> {
  const ids = [...new Set(cart.linhas.map((l) => l.produtoId))];
  const produtos = new Map((await db.produto.findMany({ where: { id: { in: ids } }, select: { id: true, nome: true, pesoEmbalagemG: true, compEmbalagemMm: true, largEmbalagemMm: true, altEmbalagemMm: true } })).map((p) => [p.id, p]));
  return cart.linhas.map((l) => {
    const p = produtos.get(l.produtoId)!;
    if (!p.pesoEmbalagemG || !p.compEmbalagemMm || !p.largEmbalagemMm || !p.altEmbalagemMm) {
      console.error(`Produto sem dados de embalagem para frete: ${p.nome} (${p.id})`);
      throw new ErroNegocio("Não conseguimos calcular o frete de um dos itens. Fale com a gente para concluir a compra.");
    }
    return { id: l.variacaoId, larguraCm: p.largEmbalagemMm / 10, alturaCm: p.altEmbalagemMm / 10, comprimentoCm: p.compEmbalagemMm / 10, pesoKg: p.pesoEmbalagemG / 1000, valorCentavos: l.precoUnitarioCentavos, quantidade: l.quantidade };
  });
}

export interface Cotacao {
  opcoes: OpcaoFreteFinal[]; subtotalCentavos: number; descontoCentavos: number; cupom: CupomAplicado | null;
  prazoPreparoDias: number; freteGratisLimiteCentavos: number | null;
}

/** Cotação completa do carrinho (cupom + frete grátis). Usada para mostrar opções E, de novo, ao fechar o pedido. */
export async function cotarCarrinho(tokenCarrinho: string | null, entrada: { cep: string; cupom?: string | null }, deps: Dependencias = {}): Promise<{ cotacao: Cotacao; cart: Carrinho }> {
  const d = dep(deps);
  if (!cepValido(entrada.cep)) throw new ErroNegocio("Informe um CEP válido.");
  const cart = await lerCarrinho(tokenCarrinho);
  if (!cart.linhas.length) throw new ErroNegocio("Seu carrinho está vazio.");
  if (cart.temProblemas) throw new ErroNegocio("Há itens indisponíveis no carrinho. Ajuste o carrinho para continuar.");
  const cfg = await lerConfiguracoes();
  const origem = cfg["frete.cepOrigem"] as string | null;
  if (!d.frete || !origem) throw new ErroNegocio("O cálculo de frete ainda não está disponível. Fale com a gente para concluir a compra.");
  const cupom = entrada.cupom?.trim() ? await validarCupom(entrada.cupom, cart.subtotalCentavos, d.agora) : null;
  let bruto;
  try { bruto = await d.frete.cotar(somenteDigitos(origem), somenteDigitos(entrada.cep), await pacotesDoCarrinho(cart)); } catch (e) { if (e instanceof ErroFrete) throw new ErroNegocio(e.message); throw e; }
  if (!bruto.length) throw new ErroNegocio("Não encontramos opções de entrega para este CEP.");
  const limite = (cfg["frete.gratisAPartirDeCentavos"] as number | null) ?? null;
  const desconto = cupom?.descontoCentavos ?? 0;
  const opcoes = aplicarFreteGratis(bruto, { baseCentavos: cart.subtotalCentavos - desconto, limiteCentavos: limite, cupomFreteGratis: cupom?.freteGratis });
  return { cart, cotacao: { opcoes, subtotalCentavos: cart.subtotalCentavos, descontoCentavos: desconto, cupom, prazoPreparoDias: cart.prazoPreparoDias, freteGratisLimiteCentavos: limite } };
}

// ───────────────────────── pedido ─────────────────────────

const texto = (min: number, max: number) => z.string().trim().min(min).max(max);
export const entradaCheckoutSchema = z.object({
  contato: z.object({ email: z.string().trim().toLowerCase().refine(emailValido, "E-mail inválido."), nome: texto(3, 120), telefone: z.string().refine(telefoneValido, "Telefone inválido (com DDD)."), cpf: z.string().refine(cpfValido, "CPF inválido.") }),
  entrega: z.object({ destinatario: texto(2, 120), cep: z.string().refine(cepValido, "CEP inválido."), logradouro: texto(2, 160), numero: texto(1, 20), complemento: z.string().trim().max(80).optional().transform((v) => v || null), bairro: texto(2, 80), cidade: texto(2, 80), uf: z.string().trim().toUpperCase().refine((u) => (UFS as readonly string[]).includes(u), "UF inválida.") }),
  freteId: texto(3, 60), cupom: z.string().trim().max(40).nullish(),
  pagamento: z.discriminatedUnion("metodo", [
    z.object({ metodo: z.literal("PIX") }),
    z.object({ metodo: z.literal("CARTAO"), token: texto(5, 200), metodoId: z.string().regex(/^[a-z0-9_]{2,30}$/), emissorId: z.string().regex(/^\d{1,10}$/).nullish(), parcelas: z.number().int().min(1).max(12) }),
  ]),
  aceitouTermos: z.literal(true, { error: "É preciso aceitar os termos para continuar." }),
  chaveIdempotencia: z.string().regex(/^[A-Za-z0-9_-]{16,64}$/),
  observacao: z.string().trim().max(300).nullish(),
});
export type EntradaCheckout = z.input<typeof entradaCheckoutSchema>;

export interface ResultadoCheckout { numero: number; tokenAcesso: string; pago: boolean; repetido: boolean }

const MENSAGENS_RECUSA: Record<string, string> = {
  cc_rejected_insufficient_amount: "Saldo ou limite insuficiente no cartão.", cc_rejected_bad_filled_card_number: "Confira o número do cartão.", cc_rejected_bad_filled_date: "Confira a validade do cartão.",
  cc_rejected_bad_filled_security_code: "Confira o código de segurança do cartão.", cc_rejected_call_for_authorize: "Autorize o pagamento com o banco emissor e tente de novo.", cc_rejected_high_risk: "O pagamento não foi aprovado por segurança. Tente outro meio de pagamento.",
};
const mensagemRecusa = (detalhe: string | null) => (detalhe && MENSAGENS_RECUSA[detalhe]) || "O pagamento foi recusado. Tente outro cartão ou pague com Pix.";

function dadosEmail(p: Prisma.PedidoGetPayload<{ include: { itens: true } }>): PedidoEmail {
  return { numero: p.numero, nome: p.nome, email: p.email, totalCentavos: p.totalCentavos, subtotalCentavos: p.subtotalCentavos, descontoCentavos: p.descontoCentavos, freteCentavos: p.freteCentavos, tokenAcesso: p.tokenAcesso, codigoRastreio: p.codigoRastreio, freteServico: p.freteServico, itens: p.itens };
}

function linhaParaItem(l: LinhaCarrinho, tipoPronta: boolean) {
  return { variacaoId: l.variacaoId, nomeProduto: l.produto.nome, sku: l.variacao.sku, corNome: l.variacao.cor, tamanho: l.variacao.tamanho, precoUnitarioCentavos: l.precoUnitarioCentavos, quantidade: l.quantidade, personalizacao: l.personalizacao.length ? l.personalizacao : undefined, reservouEstoque: tipoPronta };
}

/**
 * Fecha o pedido. Tudo que importa é recalculado AQUI no servidor: preços, estoque, cupom, frete e total.
 * Nada vindo do navegador define valores. Pedido repetido (mesma chaveIdempotencia) devolve o já criado.
 */
export async function criarPedido(entradaBruta: EntradaCheckout, tokenCarrinho: string | null, usuarioId: string | null, deps: Dependencias = {}): Promise<ResultadoCheckout> {
  const d = dep(deps);
  const entrada = entradaCheckoutSchema.parse(entradaBruta);

  const repetido = await db.pedido.findUnique({ where: { chaveIdempotencia: entrada.chaveIdempotencia } });
  if (repetido) return { numero: repetido.numero, tokenAcesso: repetido.tokenAcesso, pago: repetido.status !== "AGUARDANDO_PAGAMENTO", repetido: true };
  if (!d.pagamento) throw new ErroNegocio("O pagamento online ainda não está disponível. Fale com a gente para concluir a compra.");

  const { cotacao, cart } = await cotarCarrinho(tokenCarrinho, { cep: entrada.entrega.cep, cupom: entrada.cupom }, d);
  const frete = cotacao.opcoes.find((o) => o.id === entrada.freteId);
  if (!frete) throw new ErroNegocio("A opção de entrega escolhida não está mais disponível. Escolha novamente.");
  const total = cotacao.subtotalCentavos - cotacao.descontoCentavos + frete.precoCentavos;
  const expiraEm = new Date(d.agora.getTime() + VALIDADE_PEDIDO_MIN * 60_000);
  const tipos = new Map((await db.produto.findMany({ where: { id: { in: cart.linhas.map((l) => l.produtoId) } }, select: { id: true, tipo: true } })).map((p) => [p.id, p.tipo]));

  let pedido;
  try {
    pedido = await db.$transaction(async (tx) => {
      // 1) reserva de estoque ATÔMICA: se acabou entre o carrinho e agora, tudo é desfeito
      for (const l of cart.linhas) {
        if (tipos.get(l.produtoId) !== "PRONTA_ENTREGA") continue;
        const n = await tx.$executeRaw`UPDATE "Variacao" SET "estoque" = "estoque" - ${l.quantidade} WHERE "id" = ${l.variacaoId} AND "ativa" = true AND "disponivel" = true AND "estoque" >= ${l.quantidade}`;
        if (n !== 1) throw new ErroNegocio(`"${l.produto.nome}" acabou de esgotar. Ajuste o carrinho para continuar.`);
      }
      // 2) cupom: consome 1 uso sem estourar o limite
      if (cotacao.cupom) await consumirCupom(tx, cotacao.cupom.cupomId);
      // 3) pedido + itens (com cópia dos dados) + histórico
      const p = await tx.pedido.create({
        data: {
          usuarioId, email: entrada.contato.email, nome: entrada.contato.nome, telefone: somenteDigitos(entrada.contato.telefone), clienteDocumento: somenteDigitos(entrada.contato.cpf),
          subtotalCentavos: cotacao.subtotalCentavos, descontoCentavos: cotacao.descontoCentavos, freteCentavos: frete.precoCentavos, totalCentavos: total,
          cupomId: cotacao.cupom?.cupomId ?? null, cupomCodigo: cotacao.cupom?.codigo ?? null,
          entregaDestinatario: entrada.entrega.destinatario, entregaCep: somenteDigitos(entrada.entrega.cep), entregaLogradouro: entrada.entrega.logradouro, entregaNumero: entrada.entrega.numero,
          entregaComplemento: entrada.entrega.complemento, entregaBairro: entrada.entrega.bairro, entregaCidade: entrada.entrega.cidade, entregaUf: entrada.entrega.uf,
          freteServico: `${frete.nome}${frete.empresa ? ` (${frete.empresa})` : ""}`, freteServicoId: frete.id, fretePrazoDias: frete.prazoDias, prazoPreparoDias: cotacao.prazoPreparoDias,
          observacao: entrada.observacao ?? null, aceitouTermosEm: d.agora, chaveIdempotencia: entrada.chaveIdempotencia, expiraEm,
          itens: { create: cart.linhas.map((l) => linhaParaItem(l, tipos.get(l.produtoId) === "PRONTA_ENTREGA")) },
          historico: { create: { para: "AGUARDANDO_PAGAMENTO", nota: "Pedido criado" } },
        },
        include: { itens: true },
      });
      return p;
    });
  } catch (e) {
    if ((e as { code?: string }).code === "P2002") { // duas requisições simultâneas com a mesma chave
      const igual = await db.pedido.findUnique({ where: { chaveIdempotencia: entrada.chaveIdempotencia } });
      if (igual) return { numero: igual.numero, tokenAcesso: igual.tokenAcesso, pago: false, repetido: true };
    }
    throw e;
  }

  // 4) cobrança (fora da transação). Se falhar, o pedido é cancelado e o estoque volta.
  const pagar = { pedidoId: pedido.id, numero: pedido.numero, valorCentavos: total, descricao: `Pedido #${pedido.numero} - Afeturar`, pagador: { email: entrada.contato.email, nome: entrada.contato.nome, cpf: somenteDigitos(entrada.contato.cpf) }, urlNotificacao: d.urlBase.startsWith("https://") ? `${d.urlBase.replace(/\/$/, "")}/api/webhooks/mercadopago` : null, chaveIdempotencia: `pedido-${pedido.id}` };
  let r: ResultadoPagamento;
  try {
    r = entrada.pagamento.metodo === "PIX" ? await d.pagamento.criarPix(pagar, expiraEm) : await d.pagamento.criarCartao(pagar, { token: entrada.pagamento.token, metodoId: entrada.pagamento.metodoId, emissorId: entrada.pagamento.emissorId, parcelas: entrada.pagamento.parcelas });
  } catch (e) {
    await cancelarPedido(pedido.id, "Falha ao iniciar o pagamento", d);
    throw e instanceof ErroPagamento ? new ErroNegocio(e.message) : e;
  }
  await db.pagamento.create({
    data: {
      pedidoId: pedido.id, provedor: nomeProvedor(d.pagamento.nome), idExterno: r.idExterno, metodo: entrada.pagamento.metodo, status: "PENDENTE", valorCentavos: total,
      parcelas: entrada.pagamento.metodo === "CARTAO" ? entrada.pagamento.parcelas : null, statusDetalhe: r.detalhe,
      pixCopiaECola: r.pix?.copiaECola ?? null, pixQrBase64: r.pix?.qrBase64 ?? null, pixExpiraEm: r.pix?.expiraEm ?? null,
    },
  });

  if (r.status === "RECUSADO" || r.status === "CANCELADO") {
    await cancelarPedido(pedido.id, `Pagamento recusado (${r.detalhe ?? "sem detalhe"})`, d);
    throw new ErroNegocio(mensagemRecusa(r.detalhe));
  }

  // 5) o carrinho virou pedido; avisa o cliente e, se o cartão já foi aprovado, confirma
  if (tokenCarrinho) await esvaziarCarrinho(tokenCarrinho);
  const completo = await db.pedido.findUniqueOrThrow({ where: { id: pedido.id }, include: { itens: true } });
  await enviarEmailSeguro(emailPedidoRecebido(dadosEmail(completo), entrada.pagamento.metodo), d.email);
  let pago = false;
  if (r.status === "APROVADO") { await aplicarResultado(pedido.id, r.idExterno, "APROVADO", r.detalhe, d); pago = true; }
  return { numero: pedido.numero, tokenAcesso: pedido.tokenAcesso, pago, repetido: false };
}

async function esvaziarCarrinho(token: string) {
  const { createHash } = await import("node:crypto");
  const c = await db.carrinho.findUnique({ where: { tokenVisitante: createHash("sha256").update(token).digest("hex") } });
  if (c) await db.itemCarrinho.deleteMany({ where: { carrinhoId: c.id } });
}

// ───────────────────────── cancelamento e expiração ─────────────────────────

/** Cancela um pedido AINDA NÃO PAGO e devolve estoque/cupom. Não faz nada se o pedido já saiu de "aguardando pagamento". */
export async function cancelarPedido(pedidoId: string, motivo: string, deps: Dependencias = {}, avisoAoCliente?: string) {
  const d = dep(deps);
  const feito = await db.$transaction(async (tx) => {
    await travarPedido(tx, pedidoId);
    const p = await tx.pedido.findUnique({ where: { id: pedidoId } });
    if (!p || p.status !== "AGUARDANDO_PAGAMENTO") return false;
    await tx.pedido.update({ where: { id: pedidoId }, data: { status: "CANCELADO" } });
    await tx.historicoStatusPedido.create({ data: { pedidoId, de: "AGUARDANDO_PAGAMENTO", para: "CANCELADO", nota: motivo } });
    await tx.pagamento.updateMany({ where: { pedidoId, status: "PENDENTE" }, data: { status: "CANCELADO" } });
    await liberarReservas(tx, pedidoId);
    return true;
  });
  if (feito && avisoAoCliente) {
    const p = await db.pedido.findUniqueOrThrow({ where: { id: pedidoId }, include: { itens: true } });
    await enviarEmailSeguro(emailPedidoCancelado(dadosEmail(p), avisoAoCliente), d.email);
  }
  return feito;
}

/** Rotina agendada: cancela pedidos que passaram da validade sem pagamento. */
export async function cancelarExpirados(deps: Dependencias = {}) {
  const d = dep(deps);
  const vencidos = await db.pedido.findMany({ where: { status: "AGUARDANDO_PAGAMENTO", expiraEm: { lt: d.agora } }, select: { id: true } });
  let n = 0;
  for (const { id } of vencidos) if (await cancelarPedido(id, "Expirou sem pagamento", d, "O prazo para pagamento terminou e o pedido foi cancelado. Se ainda quiser os produtos, é só fazer um novo pedido.")) n++;
  return n;
}

// ───────────────────────── confirmação de pagamento (webhook / consulta) ─────────────────────────

async function aplicarResultado(pedidoId: string, idExterno: string, status: StatusPagamento, detalhe: string | null, d: ReturnType<typeof dep>) {
  let aprovouAgora = false;
  await db.$transaction(async (tx) => {
    await travarPedido(tx, pedidoId);
    const p = await tx.pedido.findUniqueOrThrow({ where: { id: pedidoId } });
    await tx.pagamento.updateMany({ where: { pedidoId, idExterno }, data: { status, statusDetalhe: detalhe } });
    if (status === "APROVADO") {
      if (p.status === "AGUARDANDO_PAGAMENTO") {
        await tx.pedido.update({ where: { id: pedidoId }, data: { status: "PAGAMENTO_APROVADO" } });
        await tx.historicoStatusPedido.create({ data: { pedidoId, de: "AGUARDANDO_PAGAMENTO", para: "PAGAMENTO_APROVADO", nota: `Pagamento aprovado (${idExterno})` } });
        aprovouAgora = true;
      } else if (p.status === "CANCELADO") {
        // Pagou depois de o pedido expirar/cancelar: não reabrimos sozinhos (o estoque já voltou). Fica registrado para estorno/decisão manual.
        await tx.logAuditoria.create({ data: { acao: "pagamento-apos-cancelamento", entidade: "Pedido", entidadeId: pedidoId, dados: { idExterno } } });
      }
    }
  });
  if (aprovouAgora) {
    const completo = await db.pedido.findUniqueOrThrow({ where: { id: pedidoId }, include: { itens: true } });
    await enviarEmailSeguro(emailPagamentoAprovado(dadosEmail(completo)), d.email);
  }
}

/**
 * Aplica o estado de um pagamento consultado no provedor. Seguro para repetir (webhook duplicado, polling):
 * confere valor e moeda antes de aprovar e nunca confia no corpo da notificação.
 */
export async function aplicarStatusPagamento(c: ConsultaPagamento, provedor: string, deps: Dependencias = {}): Promise<"ignorado" | "aplicado" | "divergente"> {
  const d = dep(deps);
  let pag = await db.pagamento.findUnique({ where: { provedor_idExterno: { provedor, idExterno: c.idExterno } } });
  if (!pag && c.referenciaExterna) {
    // pagamento criado no provedor, mas o registro local não chegou a ser gravado: recupera pela referência
    const ped = await db.pedido.findUnique({ where: { id: c.referenciaExterna } });
    if (ped) pag = await db.pagamento.create({ data: { pedidoId: ped.id, provedor, idExterno: c.idExterno, metodo: c.metodo, status: "PENDENTE", valorCentavos: ped.totalCentavos } });
  }
  if (!pag) return "ignorado"; // não é pagamento nosso (ex.: notificação de teste do painel)
  const ped = await db.pedido.findUniqueOrThrow({ where: { id: pag.pedidoId } });
  if (c.status === "APROVADO" && (c.valorCentavos !== ped.totalCentavos || c.moeda !== "BRL" || (c.referenciaExterna && c.referenciaExterna !== ped.id))) {
    await db.pagamento.update({ where: { id: pag.id }, data: { statusDetalhe: "valor_divergente" } });
    await registrarAuditoria(null, "pagamento-divergente", "Pedido", ped.id, { esperado: ped.totalCentavos, recebido: c.valorCentavos, moeda: c.moeda });
    return "divergente";
  }
  if (c.status === "PENDENTE") return "ignorado";
  await aplicarResultado(ped.id, c.idExterno, c.status, c.detalhe, d);
  if (c.status === "RECUSADO" || c.status === "CANCELADO") {
    const outros = await db.pagamento.count({ where: { pedidoId: ped.id, status: { in: ["PENDENTE", "APROVADO"] } } });
    if (!outros) await cancelarPedido(ped.id, `Pagamento ${c.status === "RECUSADO" ? "recusado" : "cancelado"} (${c.detalhe ?? "sem detalhe"})`, d);
  }
  return "aplicado";
}

/** Chamado pelo webhook: consulta o pagamento no provedor (fonte da verdade) e aplica. */
export async function processarNotificacaoPagamento(idExterno: string, deps: Dependencias = {}) {
  const d = dep(deps);
  if (!d.pagamento) throw new ErroNegocio("Provedor de pagamento não configurado.");
  const consulta = await d.pagamento.consultar(idExterno);
  return aplicarStatusPagamento(consulta, nomeProvedor(d.pagamento.nome), d);
}

// ───────────────────────── consulta pública do pedido ─────────────────────────

const iguais = (a: string, b: string) => a.length === b.length && timingSafeEqual(Buffer.from(a), Buffer.from(b));

/** O visitante vê o pedido com o código secreto do link; o cliente logado vê os próprios. */
export async function obterPedidoPublico(numero: number, acesso: { codigo?: string | null; usuarioId?: string | null }) {
  if (!Number.isInteger(numero) || numero < 1) return null;
  const p = await db.pedido.findUnique({ where: { numero }, include: { itens: true, pagamentos: { orderBy: { criadoEm: "desc" }, take: 1 }, historico: { orderBy: { criadoEm: "asc" } } } });
  if (!p) return null;
  const permitido = (acesso.codigo && iguais(acesso.codigo, p.tokenAcesso)) || (acesso.usuarioId && p.usuarioId === acesso.usuarioId);
  return permitido ? p : null;
}

/** Acompanhamento sem login: número + e-mail do pedido → devolve o link com o código. */
export async function localizarPedido(numero: number, email: string) {
  const p = Number.isInteger(numero) && numero > 0 ? await db.pedido.findUnique({ where: { numero }, select: { numero: true, email: true, tokenAcesso: true } }) : null;
  if (!p || !iguais(p.email.toLowerCase(), email.trim().toLowerCase())) throw new ErroNegocio("Não encontramos um pedido com esses dados. Confira o número e o e-mail usados na compra.");
  return p;
}
