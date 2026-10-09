-- ATENÇÃO: o gerador (prisma migrate diff) propôs apagar os índices únicos manuais
-- "ItemCarrinho_carrinho_variacao_key" e "Variacao_produto_cor_tamanho_key" (o Prisma não os conhece).
-- Eles são regras de integridade e DEVEM ser mantidos: sempre revise o SQL gerado antes de aplicar.

-- AlterTable
ALTER TABLE "Usuario" ADD COLUMN     "bloqueadoAte" TIMESTAMP(3),
ADD COLUMN     "falhasLogin" INTEGER NOT NULL DEFAULT 0;

-- CreateTable
CREATE TABLE "Sessao" (
    "id" TEXT NOT NULL,
    "usuarioId" TEXT NOT NULL,
    "tokenHash" TEXT NOT NULL,
    "expiraEm" TIMESTAMP(3) NOT NULL,
    "criadoEm" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "ultimoUsoEm" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "userAgent" TEXT,

    CONSTRAINT "Sessao_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "Sessao_tokenHash_key" ON "Sessao"("tokenHash");

-- CreateIndex
CREATE INDEX "Sessao_usuarioId_idx" ON "Sessao"("usuarioId");

-- CreateIndex
CREATE INDEX "Sessao_expiraEm_idx" ON "Sessao"("expiraEm");

-- AddForeignKey
ALTER TABLE "Sessao" ADD CONSTRAINT "Sessao_usuarioId_fkey" FOREIGN KEY ("usuarioId") REFERENCES "Usuario"("id") ON DELETE CASCADE ON UPDATE CASCADE;

