-- Busca da loja sem diferenciar acentos/maiúsculas: texto normalizado mantido pela aplicação.
ALTER TABLE "Produto" ADD COLUMN "indiceBusca" TEXT NOT NULL DEFAULT '';
