-- CreateEnum
CREATE TYPE "TipoProduto" AS ENUM ('PRONTA_ENTREGA', 'SOB_ENCOMENDA');

-- CreateEnum
CREATE TYPE "TipoCampo" AS ENUM ('TEXTO', 'TEXTO_LONGO');

-- CreateEnum
CREATE TYPE "Papel" AS ENUM ('CLIENTE', 'EQUIPE', 'ADMIN');

-- CreateEnum
CREATE TYPE "TipoCupom" AS ENUM ('PERCENTUAL', 'VALOR_FIXO', 'FRETE_GRATIS');

-- CreateEnum
CREATE TYPE "StatusPedido" AS ENUM ('AGUARDANDO_PAGAMENTO', 'PAGAMENTO_APROVADO', 'EM_PREPARACAO', 'PRONTO_PARA_ENVIO', 'ENVIADO', 'ENTREGUE', 'CANCELADO');

-- CreateEnum
CREATE TYPE "MetodoPagamento" AS ENUM ('PIX', 'CARTAO');

-- CreateEnum
CREATE TYPE "StatusPagamento" AS ENUM ('PENDENTE', 'APROVADO', 'RECUSADO', 'CANCELADO', 'ESTORNADO');

-- CreateTable
CREATE TABLE "Categoria" (
    "id" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "nome" TEXT NOT NULL,
    "descricao" TEXT,
    "imagemUrl" TEXT,
    "ordem" INTEGER NOT NULL DEFAULT 0,
    "ativa" BOOLEAN NOT NULL DEFAULT true,
    "paiId" TEXT,
    "criadoEm" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "atualizadoEm" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Categoria_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Produto" (
    "id" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "nome" TEXT NOT NULL,
    "descricao" TEXT,
    "caracteristicas" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "material" TEXT,
    "cuidados" TEXT,
    "tipo" "TipoProduto" NOT NULL DEFAULT 'PRONTA_ENTREGA',
    "ativo" BOOLEAN NOT NULL DEFAULT false,
    "destaque" BOOLEAN NOT NULL DEFAULT false,
    "personalizavel" BOOLEAN NOT NULL DEFAULT false,
    "precoCentavos" INTEGER NOT NULL,
    "precoPromocionalCentavos" INTEGER,
    "larguraMm" INTEGER,
    "alturaMm" INTEGER,
    "profundidadeMm" INTEGER,
    "pesoEmbalagemG" INTEGER,
    "compEmbalagemMm" INTEGER,
    "largEmbalagemMm" INTEGER,
    "altEmbalagemMm" INTEGER,
    "prazoPreparoDias" INTEGER NOT NULL DEFAULT 0,
    "seoTitulo" TEXT,
    "seoDescricao" TEXT,
    "categoriaId" TEXT NOT NULL,
    "criadoEm" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "atualizadoEm" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Produto_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Cor" (
    "id" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "nome" TEXT NOT NULL,
    "hex" TEXT,
    "ativa" BOOLEAN NOT NULL DEFAULT true,

    CONSTRAINT "Cor_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Variacao" (
    "id" TEXT NOT NULL,
    "produtoId" TEXT NOT NULL,
    "sku" TEXT NOT NULL,
    "corId" TEXT,
    "tamanho" TEXT,
    "precoCentavos" INTEGER,
    "precoPromocionalCentavos" INTEGER,
    "estoque" INTEGER NOT NULL DEFAULT 0,
    "prazoPreparoDias" INTEGER,
    "disponivel" BOOLEAN NOT NULL DEFAULT true,
    "ativa" BOOLEAN NOT NULL DEFAULT true,
    "criadoEm" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "atualizadoEm" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Variacao_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ProdutoImagem" (
    "id" TEXT NOT NULL,
    "produtoId" TEXT NOT NULL,
    "variacaoId" TEXT,
    "url" TEXT NOT NULL,
    "alt" TEXT NOT NULL,
    "ordem" INTEGER NOT NULL DEFAULT 0,

    CONSTRAINT "ProdutoImagem_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "OpcaoPersonalizacao" (
    "id" TEXT NOT NULL,
    "produtoId" TEXT NOT NULL,
    "rotulo" TEXT NOT NULL,
    "tipo" "TipoCampo" NOT NULL DEFAULT 'TEXTO',
    "obrigatoria" BOOLEAN NOT NULL DEFAULT false,
    "maxCaracteres" INTEGER NOT NULL DEFAULT 60,
    "ordem" INTEGER NOT NULL DEFAULT 0,

    CONSTRAINT "OpcaoPersonalizacao_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Usuario" (
    "id" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "nome" TEXT,
    "telefone" TEXT,
    "senhaHash" TEXT,
    "papel" "Papel" NOT NULL DEFAULT 'CLIENTE',
    "ativo" BOOLEAN NOT NULL DEFAULT true,
    "emailVerificadoEm" TIMESTAMP(3),
    "aceitouTermosEm" TIMESTAMP(3),
    "criadoEm" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "atualizadoEm" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Usuario_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Endereco" (
    "id" TEXT NOT NULL,
    "usuarioId" TEXT NOT NULL,
    "apelido" TEXT,
    "destinatario" TEXT NOT NULL,
    "cep" TEXT NOT NULL,
    "logradouro" TEXT NOT NULL,
    "numero" TEXT NOT NULL,
    "complemento" TEXT,
    "bairro" TEXT NOT NULL,
    "cidade" TEXT NOT NULL,
    "uf" TEXT NOT NULL,
    "padrao" BOOLEAN NOT NULL DEFAULT false,

    CONSTRAINT "Endereco_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Favorito" (
    "usuarioId" TEXT NOT NULL,
    "produtoId" TEXT NOT NULL,
    "criadoEm" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Favorito_pkey" PRIMARY KEY ("usuarioId","produtoId")
);

-- CreateTable
CREATE TABLE "Carrinho" (
    "id" TEXT NOT NULL,
    "usuarioId" TEXT,
    "tokenVisitante" TEXT,
    "expiraEm" TIMESTAMP(3),
    "criadoEm" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "atualizadoEm" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Carrinho_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ItemCarrinho" (
    "id" TEXT NOT NULL,
    "carrinhoId" TEXT NOT NULL,
    "variacaoId" TEXT NOT NULL,
    "quantidade" INTEGER NOT NULL DEFAULT 1,
    "personalizacao" JSONB,

    CONSTRAINT "ItemCarrinho_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Cupom" (
    "id" TEXT NOT NULL,
    "codigo" TEXT NOT NULL,
    "tipo" "TipoCupom" NOT NULL,
    "valor" INTEGER NOT NULL DEFAULT 0,
    "minimoCentavos" INTEGER,
    "usoMaximo" INTEGER,
    "usos" INTEGER NOT NULL DEFAULT 0,
    "inicioEm" TIMESTAMP(3),
    "fimEm" TIMESTAMP(3),
    "ativo" BOOLEAN NOT NULL DEFAULT true,
    "criadoEm" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Cupom_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Pedido" (
    "id" TEXT NOT NULL,
    "numero" SERIAL NOT NULL,
    "status" "StatusPedido" NOT NULL DEFAULT 'AGUARDANDO_PAGAMENTO',
    "usuarioId" TEXT,
    "email" TEXT NOT NULL,
    "nome" TEXT NOT NULL,
    "telefone" TEXT,
    "subtotalCentavos" INTEGER NOT NULL,
    "descontoCentavos" INTEGER NOT NULL DEFAULT 0,
    "freteCentavos" INTEGER NOT NULL DEFAULT 0,
    "totalCentavos" INTEGER NOT NULL,
    "cupomId" TEXT,
    "cupomCodigo" TEXT,
    "entregaDestinatario" TEXT NOT NULL,
    "entregaCep" TEXT NOT NULL,
    "entregaLogradouro" TEXT NOT NULL,
    "entregaNumero" TEXT NOT NULL,
    "entregaComplemento" TEXT,
    "entregaBairro" TEXT NOT NULL,
    "entregaCidade" TEXT NOT NULL,
    "entregaUf" TEXT NOT NULL,
    "freteServico" TEXT,
    "fretePrazoDias" INTEGER,
    "prazoPreparoDias" INTEGER NOT NULL DEFAULT 0,
    "codigoRastreio" TEXT,
    "enviadoEm" TIMESTAMP(3),
    "entregueEm" TIMESTAMP(3),
    "observacao" TEXT,
    "aceitouTermosEm" TIMESTAMP(3) NOT NULL,
    "criadoEm" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "atualizadoEm" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Pedido_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ItemPedido" (
    "id" TEXT NOT NULL,
    "pedidoId" TEXT NOT NULL,
    "variacaoId" TEXT,
    "nomeProduto" TEXT NOT NULL,
    "sku" TEXT NOT NULL,
    "corNome" TEXT,
    "tamanho" TEXT,
    "precoUnitarioCentavos" INTEGER NOT NULL,
    "quantidade" INTEGER NOT NULL,
    "personalizacao" JSONB,

    CONSTRAINT "ItemPedido_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "HistoricoStatusPedido" (
    "id" TEXT NOT NULL,
    "pedidoId" TEXT NOT NULL,
    "de" "StatusPedido",
    "para" "StatusPedido" NOT NULL,
    "nota" TEXT,
    "autorId" TEXT,
    "criadoEm" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "HistoricoStatusPedido_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Pagamento" (
    "id" TEXT NOT NULL,
    "pedidoId" TEXT NOT NULL,
    "provedor" TEXT NOT NULL DEFAULT 'MERCADO_PAGO',
    "idExterno" TEXT,
    "metodo" "MetodoPagamento" NOT NULL,
    "status" "StatusPagamento" NOT NULL DEFAULT 'PENDENTE',
    "valorCentavos" INTEGER NOT NULL,
    "parcelas" INTEGER,
    "pixCopiaECola" TEXT,
    "pixExpiraEm" TIMESTAMP(3),
    "criadoEm" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "atualizadoEm" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Pagamento_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "EventoWebhook" (
    "id" TEXT NOT NULL,
    "provedor" TEXT NOT NULL,
    "idEvento" TEXT NOT NULL,
    "tipo" TEXT,
    "payload" JSONB NOT NULL,
    "recebidoEm" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "processadoEm" TIMESTAMP(3),
    "erro" TEXT,

    CONSTRAINT "EventoWebhook_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Configuracao" (
    "chave" TEXT NOT NULL,
    "valor" JSONB NOT NULL,
    "atualizadoEm" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Configuracao_pkey" PRIMARY KEY ("chave")
);

-- CreateTable
CREATE TABLE "Banner" (
    "id" TEXT NOT NULL,
    "titulo" TEXT NOT NULL,
    "subtitulo" TEXT,
    "imagemUrl" TEXT,
    "link" TEXT,
    "textoBotao" TEXT,
    "ordem" INTEGER NOT NULL DEFAULT 0,
    "ativo" BOOLEAN NOT NULL DEFAULT true,
    "inicioEm" TIMESTAMP(3),
    "fimEm" TIMESTAMP(3),

    CONSTRAINT "Banner_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PaginaInstitucional" (
    "slug" TEXT NOT NULL,
    "titulo" TEXT NOT NULL,
    "conteudo" TEXT NOT NULL,
    "publicada" BOOLEAN NOT NULL DEFAULT false,
    "atualizadoEm" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "PaginaInstitucional_pkey" PRIMARY KEY ("slug")
);

-- CreateTable
CREATE TABLE "InscritoNewsletter" (
    "id" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "consentimentoEm" TIMESTAMP(3) NOT NULL,
    "origem" TEXT,
    "canceladoEm" TIMESTAMP(3),

    CONSTRAINT "InscritoNewsletter_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "LogAuditoria" (
    "id" TEXT NOT NULL,
    "usuarioId" TEXT,
    "acao" TEXT NOT NULL,
    "entidade" TEXT NOT NULL,
    "entidadeId" TEXT,
    "dados" JSONB,
    "criadoEm" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "LogAuditoria_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "Categoria_slug_key" ON "Categoria"("slug");

-- CreateIndex
CREATE INDEX "Categoria_paiId_idx" ON "Categoria"("paiId");

-- CreateIndex
CREATE UNIQUE INDEX "Produto_slug_key" ON "Produto"("slug");

-- CreateIndex
CREATE INDEX "Produto_categoriaId_ativo_idx" ON "Produto"("categoriaId", "ativo");

-- CreateIndex
CREATE INDEX "Produto_destaque_ativo_idx" ON "Produto"("destaque", "ativo");

-- CreateIndex
CREATE UNIQUE INDEX "Cor_slug_key" ON "Cor"("slug");

-- CreateIndex
CREATE UNIQUE INDEX "Variacao_sku_key" ON "Variacao"("sku");

-- CreateIndex
CREATE INDEX "Variacao_produtoId_idx" ON "Variacao"("produtoId");

-- CreateIndex
CREATE INDEX "ProdutoImagem_produtoId_ordem_idx" ON "ProdutoImagem"("produtoId", "ordem");

-- CreateIndex
CREATE INDEX "OpcaoPersonalizacao_produtoId_idx" ON "OpcaoPersonalizacao"("produtoId");

-- CreateIndex
CREATE UNIQUE INDEX "Usuario_email_key" ON "Usuario"("email");

-- CreateIndex
CREATE INDEX "Endereco_usuarioId_idx" ON "Endereco"("usuarioId");

-- CreateIndex
CREATE UNIQUE INDEX "Carrinho_tokenVisitante_key" ON "Carrinho"("tokenVisitante");

-- CreateIndex
CREATE INDEX "Carrinho_usuarioId_idx" ON "Carrinho"("usuarioId");

-- CreateIndex
CREATE INDEX "ItemCarrinho_carrinhoId_idx" ON "ItemCarrinho"("carrinhoId");

-- CreateIndex
CREATE UNIQUE INDEX "Cupom_codigo_key" ON "Cupom"("codigo");

-- CreateIndex
CREATE UNIQUE INDEX "Pedido_numero_key" ON "Pedido"("numero");

-- CreateIndex
CREATE INDEX "Pedido_status_criadoEm_idx" ON "Pedido"("status", "criadoEm");

-- CreateIndex
CREATE INDEX "Pedido_usuarioId_idx" ON "Pedido"("usuarioId");

-- CreateIndex
CREATE INDEX "Pedido_email_idx" ON "Pedido"("email");

-- CreateIndex
CREATE INDEX "ItemPedido_pedidoId_idx" ON "ItemPedido"("pedidoId");

-- CreateIndex
CREATE INDEX "HistoricoStatusPedido_pedidoId_criadoEm_idx" ON "HistoricoStatusPedido"("pedidoId", "criadoEm");

-- CreateIndex
CREATE INDEX "Pagamento_pedidoId_idx" ON "Pagamento"("pedidoId");

-- CreateIndex
CREATE UNIQUE INDEX "Pagamento_provedor_idExterno_key" ON "Pagamento"("provedor", "idExterno");

-- CreateIndex
CREATE UNIQUE INDEX "EventoWebhook_provedor_idEvento_key" ON "EventoWebhook"("provedor", "idEvento");

-- CreateIndex
CREATE UNIQUE INDEX "InscritoNewsletter_email_key" ON "InscritoNewsletter"("email");

-- CreateIndex
CREATE INDEX "LogAuditoria_entidade_entidadeId_idx" ON "LogAuditoria"("entidade", "entidadeId");

-- CreateIndex
CREATE INDEX "LogAuditoria_criadoEm_idx" ON "LogAuditoria"("criadoEm");

-- AddForeignKey
ALTER TABLE "Categoria" ADD CONSTRAINT "Categoria_paiId_fkey" FOREIGN KEY ("paiId") REFERENCES "Categoria"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Produto" ADD CONSTRAINT "Produto_categoriaId_fkey" FOREIGN KEY ("categoriaId") REFERENCES "Categoria"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Variacao" ADD CONSTRAINT "Variacao_produtoId_fkey" FOREIGN KEY ("produtoId") REFERENCES "Produto"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Variacao" ADD CONSTRAINT "Variacao_corId_fkey" FOREIGN KEY ("corId") REFERENCES "Cor"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ProdutoImagem" ADD CONSTRAINT "ProdutoImagem_produtoId_fkey" FOREIGN KEY ("produtoId") REFERENCES "Produto"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ProdutoImagem" ADD CONSTRAINT "ProdutoImagem_variacaoId_fkey" FOREIGN KEY ("variacaoId") REFERENCES "Variacao"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "OpcaoPersonalizacao" ADD CONSTRAINT "OpcaoPersonalizacao_produtoId_fkey" FOREIGN KEY ("produtoId") REFERENCES "Produto"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Endereco" ADD CONSTRAINT "Endereco_usuarioId_fkey" FOREIGN KEY ("usuarioId") REFERENCES "Usuario"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Favorito" ADD CONSTRAINT "Favorito_usuarioId_fkey" FOREIGN KEY ("usuarioId") REFERENCES "Usuario"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Favorito" ADD CONSTRAINT "Favorito_produtoId_fkey" FOREIGN KEY ("produtoId") REFERENCES "Produto"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Carrinho" ADD CONSTRAINT "Carrinho_usuarioId_fkey" FOREIGN KEY ("usuarioId") REFERENCES "Usuario"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ItemCarrinho" ADD CONSTRAINT "ItemCarrinho_carrinhoId_fkey" FOREIGN KEY ("carrinhoId") REFERENCES "Carrinho"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ItemCarrinho" ADD CONSTRAINT "ItemCarrinho_variacaoId_fkey" FOREIGN KEY ("variacaoId") REFERENCES "Variacao"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Pedido" ADD CONSTRAINT "Pedido_usuarioId_fkey" FOREIGN KEY ("usuarioId") REFERENCES "Usuario"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Pedido" ADD CONSTRAINT "Pedido_cupomId_fkey" FOREIGN KEY ("cupomId") REFERENCES "Cupom"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ItemPedido" ADD CONSTRAINT "ItemPedido_pedidoId_fkey" FOREIGN KEY ("pedidoId") REFERENCES "Pedido"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ItemPedido" ADD CONSTRAINT "ItemPedido_variacaoId_fkey" FOREIGN KEY ("variacaoId") REFERENCES "Variacao"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "HistoricoStatusPedido" ADD CONSTRAINT "HistoricoStatusPedido_pedidoId_fkey" FOREIGN KEY ("pedidoId") REFERENCES "Pedido"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "HistoricoStatusPedido" ADD CONSTRAINT "HistoricoStatusPedido_autorId_fkey" FOREIGN KEY ("autorId") REFERENCES "Usuario"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Pagamento" ADD CONSTRAINT "Pagamento_pedidoId_fkey" FOREIGN KEY ("pedidoId") REFERENCES "Pedido"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "LogAuditoria" ADD CONSTRAINT "LogAuditoria_usuarioId_fkey" FOREIGN KEY ("usuarioId") REFERENCES "Usuario"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- ───────────────────────── Regras de integridade (CHECK / índices parciais) ─────────────────────────
-- O Prisma não expressa estas regras; ficam no banco como última linha de defesa,
-- além da validação feita na aplicação.

ALTER TABLE "Produto"
  ADD CONSTRAINT "Produto_preco_valido" CHECK ("precoCentavos" >= 0),
  ADD CONSTRAINT "Produto_promocao_valida" CHECK ("precoPromocionalCentavos" IS NULL OR ("precoPromocionalCentavos" >= 0 AND "precoPromocionalCentavos" < "precoCentavos")),
  ADD CONSTRAINT "Produto_prazo_valido" CHECK ("prazoPreparoDias" >= 0);

ALTER TABLE "Variacao"
  ADD CONSTRAINT "Variacao_estoque_nao_negativo" CHECK ("estoque" >= 0),
  ADD CONSTRAINT "Variacao_preco_valido" CHECK ("precoCentavos" IS NULL OR "precoCentavos" >= 0),
  ADD CONSTRAINT "Variacao_promocao_valida" CHECK ("precoPromocionalCentavos" IS NULL OR "precoPromocionalCentavos" >= 0),
  ADD CONSTRAINT "Variacao_prazo_valido" CHECK ("prazoPreparoDias" IS NULL OR "prazoPreparoDias" >= 0);

-- Mesma combinação produto + cor + tamanho não pode se repetir (NULL conta como valor).
CREATE UNIQUE INDEX "Variacao_produto_cor_tamanho_key" ON "Variacao" ("produtoId", "corId", "tamanho") NULLS NOT DISTINCT;

ALTER TABLE "ItemCarrinho" ADD CONSTRAINT "ItemCarrinho_quantidade_positiva" CHECK ("quantidade" > 0);
CREATE UNIQUE INDEX "ItemCarrinho_carrinho_variacao_key" ON "ItemCarrinho" ("carrinhoId", "variacaoId");

ALTER TABLE "ItemPedido"
  ADD CONSTRAINT "ItemPedido_quantidade_positiva" CHECK ("quantidade" > 0),
  ADD CONSTRAINT "ItemPedido_preco_valido" CHECK ("precoUnitarioCentavos" >= 0);

ALTER TABLE "Pedido"
  ADD CONSTRAINT "Pedido_valores_validos" CHECK ("subtotalCentavos" >= 0 AND "descontoCentavos" >= 0 AND "freteCentavos" >= 0 AND "totalCentavos" >= 0),
  ADD CONSTRAINT "Pedido_desconto_limitado" CHECK ("descontoCentavos" <= "subtotalCentavos"),
  ADD CONSTRAINT "Pedido_total_confere" CHECK ("totalCentavos" = "subtotalCentavos" - "descontoCentavos" + "freteCentavos");

ALTER TABLE "Cupom"
  ADD CONSTRAINT "Cupom_codigo_maiusculo" CHECK ("codigo" = upper("codigo")),
  ADD CONSTRAINT "Cupom_valor_valido" CHECK ("valor" >= 0 AND ("tipo" <> 'PERCENTUAL' OR "valor" BETWEEN 1 AND 100)),
  ADD CONSTRAINT "Cupom_usos_validos" CHECK ("usos" >= 0 AND ("usoMaximo" IS NULL OR "usoMaximo" >= 0));

ALTER TABLE "Pagamento" ADD CONSTRAINT "Pagamento_valor_valido" CHECK ("valorCentavos" >= 0);

-- Cada usuário tem no máximo um endereço padrão.
CREATE UNIQUE INDEX "Endereco_um_padrao_por_usuario" ON "Endereco" ("usuarioId") WHERE "padrao";
