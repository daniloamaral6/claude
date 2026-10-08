/**
 * DADOS ILUSTRATIVOS — usados apenas nas telas de protótipo (Etapa 2).
 * Nomes, preços, estoques, prazos e pedidos NÃO são reais e não representam o catálogo da Afeturar.
 * Serão substituídos por dados do banco no MVP.
 */

export const brl = (v: number) => v.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });

/** Cores de variação citadas no briefing. Os tons dos mostruários são aproximações de UI, não cores de produto. */
export const cores = [
  { id: "preto", nome: "Preto", css: "#1f1f1f" },
  { id: "branco", nome: "Branco", css: "#f7f7f5" },
  { id: "marrom", nome: "Marrom", css: "#6b4331" },
  { id: "bege", nome: "Bege caucasiano", css: "#e3c8a8" },
  { id: "verde-oliva", nome: "Verde oliva", css: "#6e7040" },
  { id: "verde-menta", nome: "Verde menta", css: "#a8d8c0" },
  { id: "rosa-bebe", nome: "Rosa bebê", css: "#f4c6d0" },
  { id: "vermelho", nome: "Vermelho", css: "#b3261e" },
  { id: "azul", nome: "Azul", css: "#3b5f9a" },
  { id: "dourado", nome: "Dourado", css: "#c9a24a" },
  { id: "marmore", nome: "Mármore", css: "linear-gradient(135deg,#f4f1ee 0%,#cfc9c4 45%,#f4f1ee 70%,#b9b2ab 100%)" },
] as const;

export type Disponibilidade = "pronta" | "encomenda";

export interface ProdutoExemplo {
  slug: string;
  nome: string;
  categoria: string; // slug da categoria
  preco: number;
  promocional?: number;
  disponibilidade: Disponibilidade;
  prazoPreparo: string;
  cores: string[]; // ids de cores
  personalizavel?: boolean;
}

export const produtosExemplo: ProdutoExemplo[] = [
  { slug: "exemplo-1", nome: "Produto de exemplo 1", categoria: "casa-decoracao", preco: 100, disponibilidade: "pronta", prazoPreparo: "Envio em até 2 dias úteis", cores: ["branco", "bege", "marmore"] },
  { slug: "exemplo-2", nome: "Produto de exemplo 2", categoria: "casa-decoracao", preco: 80, promocional: 64, disponibilidade: "pronta", prazoPreparo: "Envio em até 2 dias úteis", cores: ["preto", "dourado"] },
  { slug: "exemplo-3", nome: "Produto de exemplo 3", categoria: "organizacao", preco: 50, disponibilidade: "encomenda", prazoPreparo: "Preparo de 5 a 7 dias úteis", cores: ["rosa-bebe", "verde-menta", "branco"], personalizavel: true },
  { slug: "exemplo-4", nome: "Produto de exemplo 4", categoria: "organizacao", preco: 60, disponibilidade: "pronta", prazoPreparo: "Envio em até 2 dias úteis", cores: ["marrom", "bege"] },
  { slug: "exemplo-5", nome: "Produto de exemplo 5", categoria: "personalizados", preco: 40, disponibilidade: "encomenda", prazoPreparo: "Preparo de 5 a 7 dias úteis", cores: ["vermelho", "azul", "verde-oliva"], personalizavel: true },
  { slug: "exemplo-6", nome: "Produto de exemplo 6", categoria: "presentes", preco: 120, disponibilidade: "pronta", prazoPreparo: "Envio em até 2 dias úteis", cores: ["branco", "dourado"] },
];

export const statusPedido = [
  "Aguardando pagamento",
  "Pagamento aprovado",
  "Em preparação",
  "Pronto para envio",
  "Enviado",
  "Entregue",
  "Cancelado",
] as const;
export type StatusPedido = (typeof statusPedido)[number];

export const pedidosExemplo: { id: string; cliente: string; total: number; status: StatusPedido; data: string }[] = [
  { id: "EX-0001", cliente: "Cliente exemplo A", total: 164, status: "Aguardando pagamento", data: "08/10/2026" },
  { id: "EX-0002", cliente: "Cliente exemplo B", total: 100, status: "Pagamento aprovado", data: "08/10/2026" },
  { id: "EX-0003", cliente: "Cliente exemplo C", total: 220, status: "Em preparação", data: "07/10/2026" },
  { id: "EX-0004", cliente: "Cliente exemplo D", total: 60, status: "Pronto para envio", data: "06/10/2026" },
  { id: "EX-0005", cliente: "Cliente exemplo E", total: 140, status: "Enviado", data: "05/10/2026" },
  { id: "EX-0006", cliente: "Cliente exemplo F", total: 80, status: "Entregue", data: "01/10/2026" },
  { id: "EX-0007", cliente: "Cliente exemplo G", total: 50, status: "Cancelado", data: "30/09/2026" },
];
