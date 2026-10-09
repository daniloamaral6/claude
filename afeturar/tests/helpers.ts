import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "../src/generated/prisma/client";

const url = process.env.TEST_DATABASE_URL ?? "postgresql://postgres@127.0.0.1:5433/afeturar_test";
export const prisma = new PrismaClient({ adapter: new PrismaPg({ connectionString: url }) });

const tabelas = [
  "LogAuditoria", "InscritoNewsletter", "PaginaInstitucional", "Banner", "Configuracao", "EventoWebhook",
  "Pagamento", "HistoricoStatusPedido", "ItemPedido", "Pedido", "Cupom", "ItemCarrinho", "Carrinho", "Favorito",
  "Endereco", "Usuario", "OpcaoPersonalizacao", "ProdutoImagem", "Variacao", "Cor", "Produto", "Categoria",
];

export async function limparBanco() {
  await prisma.$executeRawUnsafe(`TRUNCATE ${tabelas.map((t) => `"${t}"`).join(", ")} RESTART IDENTITY CASCADE`);
}

export async function criarProdutoBase(extra: Record<string, unknown> = {}) {
  const categoria = await prisma.categoria.create({ data: { slug: `cat-${Math.random()}`, nome: "Categoria de teste" } });
  return prisma.produto.create({
    data: { slug: `p-${Math.random()}`, nome: "Produto de teste", precoCentavos: 10000, categoriaId: categoria.id, ...extra },
  });
}

export const dadosEntrega = {
  entregaDestinatario: "Teste", entregaCep: "00000000", entregaLogradouro: "Rua", entregaNumero: "1",
  entregaBairro: "Bairro", entregaCidade: "Cidade", entregaUf: "XX",
};
