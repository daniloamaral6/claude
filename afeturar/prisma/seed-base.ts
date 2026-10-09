import type { PrismaClient } from "../src/generated/prisma/client";

/**
 * Dados-base REAIS e idempotentes (podem rodar várias vezes).
 * Não cria produtos, preços, avaliações, pedidos nem informações de contato:
 * esses dados são cadastrados pelo painel.
 */

const categorias = [
  ["casa-decoracao", "Casa & Decoração"],
  ["organizacao", "Organização"],
  ["beleza-acessorios", "Beleza & Acessórios"],
  ["pet", "Pet"],
  ["fe", "Fé"],
  ["presentes", "Presentes"],
  ["personalizados", "Personalizados"],
] as const;

// Cores citadas no briefing. O hex é só mostruário de interface (aproximação), não cor oficial de produto.
const cores = [
  ["preto", "Preto", "#1f1f1f"],
  ["branco", "Branco", "#f7f7f5"],
  ["marrom", "Marrom", "#6b4331"],
  ["bege-caucasiano", "Bege caucasiano", "#e3c8a8"],
  ["verde-oliva", "Verde oliva", "#6e7040"],
  ["verde-menta", "Verde menta", "#a8d8c0"],
  ["rosa-bebe", "Rosa bebê", "#f4c6d0"],
  ["vermelho", "Vermelho", "#b3261e"],
  ["azul", "Azul", "#3b5f9a"],
  ["dourado", "Dourado", "#c9a24a"],
  ["marmore", "Mármore", null],
] as const;

// Páginas institucionais: nascem como rascunho e vazias. Textos jurídicos exigem revisão antes de publicar.
const paginas = [
  ["sobre", "Sobre a Afeturar"],
  ["fale-conosco", "Fale conosco"],
  ["perguntas-frequentes", "Perguntas frequentes"],
  ["politica-de-privacidade", "Política de privacidade"],
  ["termos-de-uso", "Termos de uso"],
  ["trocas-e-devolucoes", "Trocas e devoluções"],
  ["politica-de-entrega", "Política de entrega"],
  ["acompanhar-pedido", "Acompanhar pedido"],
] as const;

// Configurações com valor ainda NÃO informado (null) — nunca inventar contato ou regra comercial.
const configuracoes: [string, unknown][] = [
  ["loja.nome", "Afeturar"],
  ["loja.slogan", "Dê forma ao que você sente."],
  ["contato.whatsapp", null],
  ["contato.email", null],
  ["empresa.cnpj", null],
  ["empresa.endereco", null],
  ["redes.instagram", "https://www.instagram.com/afeturar"],
  ["frete.cepOrigem", null],
  ["frete.gratisAPartirDeCentavos", null],
];

export async function seedBase(prisma: PrismaClient) {
  for (const [i, [slug, nome]] of categorias.entries()) {
    await prisma.categoria.upsert({ where: { slug }, update: {}, create: { slug, nome, ordem: i } });
  }
  for (const [slug, nome, hex] of cores) {
    await prisma.cor.upsert({ where: { slug }, update: {}, create: { slug, nome, hex } });
  }
  for (const [slug, titulo] of paginas) {
    await prisma.paginaInstitucional.upsert({ where: { slug }, update: {}, create: { slug, titulo, conteudo: "", publicada: false } });
  }
  for (const [chave, valor] of configuracoes) {
    await prisma.configuracao.upsert({
      where: { chave },
      update: {},
      create: { chave, valor: valor as never },
    });
  }
}
