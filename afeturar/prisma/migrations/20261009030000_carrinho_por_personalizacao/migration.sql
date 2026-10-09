-- Dois itens iguais com personalizações diferentes (ex.: dois chaveiros com nomes distintos) são linhas separadas.
ALTER TABLE "ItemCarrinho" ADD COLUMN "chave" TEXT NOT NULL DEFAULT '';
DROP INDEX "ItemCarrinho_carrinho_variacao_key";
CREATE UNIQUE INDEX "ItemCarrinho_carrinho_variacao_chave_key" ON "ItemCarrinho" ("carrinhoId", "variacaoId", "chave");
