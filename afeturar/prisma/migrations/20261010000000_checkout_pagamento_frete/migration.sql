-- Pedido: dados do checkout
ALTER TABLE "Pedido" ADD COLUMN "clienteDocumento" TEXT,
ADD COLUMN "freteServicoId" TEXT,
ADD COLUMN "chaveIdempotencia" TEXT,
ADD COLUMN "tokenAcesso" TEXT,
ADD COLUMN "expiraEm" TIMESTAMP(3),
ADD COLUMN "estoqueDevolvidoEm" TIMESTAMP(3);
-- pedidos antigos (se houver) recebem um código de acesso aleatório
UPDATE "Pedido" SET "tokenAcesso" = md5(random()::text || clock_timestamp()::text || "id") WHERE "tokenAcesso" IS NULL;
ALTER TABLE "Pedido" ALTER COLUMN "tokenAcesso" SET NOT NULL;
CREATE UNIQUE INDEX "Pedido_chaveIdempotencia_key" ON "Pedido"("chaveIdempotencia");
CREATE UNIQUE INDEX "Pedido_tokenAcesso_key" ON "Pedido"("tokenAcesso");

-- Pagamento: dados do Pix e motivo do provedor
ALTER TABLE "Pagamento" ADD COLUMN "pixQrBase64" TEXT, ADD COLUMN "statusDetalhe" TEXT;

-- Recuperação de senha
CREATE TABLE "RecuperacaoSenha" (
    "id" TEXT NOT NULL,
    "usuarioId" TEXT NOT NULL,
    "tokenHash" TEXT NOT NULL,
    "expiraEm" TIMESTAMP(3) NOT NULL,
    "usadoEm" TIMESTAMP(3),
    "criadoEm" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "RecuperacaoSenha_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "RecuperacaoSenha_tokenHash_key" ON "RecuperacaoSenha"("tokenHash");
CREATE INDEX "RecuperacaoSenha_usuarioId_idx" ON "RecuperacaoSenha"("usuarioId");
ALTER TABLE "RecuperacaoSenha" ADD CONSTRAINT "RecuperacaoSenha_usuarioId_fkey" FOREIGN KEY ("usuarioId") REFERENCES "Usuario"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- Integridade: um cupom nunca passa do limite de usos; CPF e CEP só com dígitos
ALTER TABLE "Cupom" ADD CONSTRAINT "Cupom_usos_dentro_do_limite" CHECK ("usoMaximo" IS NULL OR "usos" <= "usoMaximo");
ALTER TABLE "Pedido" ADD CONSTRAINT "Pedido_documento_digitos" CHECK ("clienteDocumento" IS NULL OR "clienteDocumento" ~ '^[0-9]{11}$');
