# Afeturar — loja virtual

Projeto novo e independente (não faz parte do "Diário de Saúde" da raiz do repositório).

## Estado atual: Etapa 2 (fundação visual) — em aprovação

Implementado: Next.js 16 + TypeScript + Tailwind 4, tokens de cor, cabeçalho (menu móvel, busca, conta,
favoritos, carrinho), rodapé, home, rotas de categorias e institucionais (conteúdo "em breve").
**Ainda não existem**: catálogo, banco, carrinho, checkout, pagamento, frete e painel (Etapa 3).

```
npm install
npm run dev        # http://localhost:3000
npm run build && npm run typecheck && npm run lint
```

## Identidade — o que é fato, aproximação e proposta

| Item | Status |
|---|---|
| Logo `public/brand/logo-afeturar.jpeg` | Arquivo do kit, **sem alteração**. JPEG 1254×1254 com fundo opaco; não é vetor nem transparente; aprovação como versão final não comprovada |
| Cores `--color-creme/marrom/terracota-escuro/terracota/cobre` | **Aproximadas**, medidas no JPEG; não são oficiais (`src/app/globals.css`) |
| Cores `creme-profundo`, `linha`, `marrom-suave`, `acao-hover`, `erro` | **Proposta nova** deste projeto |
| Slogan "Dê forma ao que você sente." | Observado no logo |
| Tipografia | Fonte da marca **não identificada**. Usamos a pilha de fontes do sistema (proposta provisória) |
| Favicon / ícone de app | **Não criado** (falta arquivo adequado) |
| Foto de ambiente, fotos de produtos | **Faltam**; não usamos as capturas do kit |

Contraste medido (WCAG): marrom/creme 12,3:1; creme sobre terracota escuro (botão) 6,9:1 (AA);
terracota `#C1846F` (2,9:1) e cobre `#D89477` (2,3:1) **não** servem para texto — só detalhes decorativos.

O logo é exibido recortado em círculo por CSS (`rounded-full`) para esconder os cantos brancos do JPEG;
o arquivo não é modificado, e o recorte fica fora do anel do desenho.

## Pendências de arquivos
Logo vetorial/PNG transparente, tipografia da marca, manual/paleta oficial, fotos reais, número de WhatsApp,
dados da empresa (CNPJ, endereço, e-mail). Dados editáveis ficam em `src/lib/site.ts` (no MVP irão para o painel).

## Etapa 2 — telas de protótipo (catálogo, produto, carrinho, checkout, admin)

Rotas (já com a estrutura final): `/categorias/[slug]`, `/produtos/[slug]`, `/carrinho`, `/checkout`,
`/admin`, `/admin/produtos`, `/admin/produtos/novo`, `/admin/pedidos`.

- Todos os dados vêm de `src/lib/exemplo.ts` e são **ilustrativos** (nomes "Produto de exemplo N", preços
  redondos, pedidos fictícios). Cada tela exibe o aviso "Protótipo de design". Não há fotos: os espaços
  são reservados para fotografia real.
- Interações de UI já funcionam (filtros, ordenação, variação de cor, quantidade, remoção, validação de
  e-mail/CEP, cupom com erro). **Nada é persistido, enviado ou cobrado.**
- Admin sem login. Autenticação, banco, pagamento (Mercado Pago), frete (Melhor Envio) e validação de
  preços no servidor entram na Etapa 3/4.
- Os mostruários de cor (preto, branco, marrom, bege caucasiano, verde oliva, verde menta, rosa bebê,
  vermelho, azul, dourado, mármore) usam tons aproximados de interface, não cores reais de produto.

## Layout da home (referência enviada pela cliente)

Adotado **apenas o layout** da imagem de referência: faixa de avisos no topo, cabeçalho com menu central
(Início, Loja, Categorias com submenu, Novidades, Sobre, Contato) e ícones, banner com foto à direita e
texto à esquerda, faixa de categorias com foto, carrosséis de produtos, depoimentos e rodapé com
newsletter e redes.

**Não foi copiado** (conteúdo da referência): as categorias dela, textos, preços, avaliações e depoimentos
com pessoas, fotos, o logotipo em letras e a frase cursiva. A faixa de avisos usa textos neutros editáveis
(`avisosTopo` em `src/lib/site.ts`); o valor mínimo de frete grátis está **a configurar**.
Títulos em serifa do sistema (`--font-serif`) são proposta a partir do layout, não a fonte da marca.
Depoimentos: só reais e autorizados; hoje são espaços reservados. Novas rotas: `/loja` e `/lancamentos`.

## Fase 1 — banco de dados (PostgreSQL + Prisma 7)

**Modelo** (`prisma/schema.prisma`, 22 tabelas): catálogo (categorias com subcategorias, produtos, cores, variações com
SKU/preço/estoque/prazo próprios, imagens, campos de personalização), pessoas (usuários com papéis CLIENTE/EQUIPE/ADMIN,
endereços, favoritos), carrinho (de usuário ou visitante), cupons, pedidos com os 7 status + histórico, pagamentos,
eventos de webhook (idempotência), configurações editáveis, banners, páginas institucionais, newsletter (com consentimento)
e log de auditoria.

**Decisões**
- Dinheiro em **centavos (Int)**, nunca float.
- Pedido guarda **snapshot** (nome, SKU, preço, endereço): mudar o catálogo não altera pedidos antigos.
- Sem dados de cartão: o pagamento é tokenizado pelo Mercado Pago.
- Regras de integridade também **no banco** (migração SQL): estoque ≥ 0, promoção < preço, total do pedido = subtotal − desconto + frete,
  quantidade > 0, cupom em maiúsculas e percentual 1–100, um endereço padrão por usuário, variação única por produto+cor+tamanho.
- Pagamento único por `(provedor, idExterno)` e webhook único por `(provedor, idEvento)`: impede processar duas vezes.
- O seed (`prisma/seed-base.ts`) cria só dados reais e idempotentes: 7 categorias, 11 cores do briefing, 8 páginas
  institucionais **como rascunho vazio** e configurações com `null` onde falta informação (WhatsApp, e-mail, CNPJ, CEP de origem, frete grátis).
  **Não cria produtos, preços, pedidos nem contatos.**

**Rodando localmente**
```
cp .env.example .env        # ajuste DATABASE_URL (PostgreSQL 15+)
npm install                 # gera o cliente do Prisma (postinstall)
npm run db:migrate          # aplica as migrações
npm run db:seed             # dados-base
npm test                    # testes do banco (usa TEST_DATABASE_URL, padrão afeturar_test em 127.0.0.1:5433)
```

**Produção (Fase 2):** PostgreSQL gerenciado (Neon ou Supabase) com backups automáticos; `DATABASE_URL` só como variável de ambiente.

**Aviso de dependências:** `npm audit` aponta itens em `mysql2` e `deepmerge-ts`, que vêm da **CLI do `prisma`** (ferramenta de
desenvolvimento/migração). A loja usa PostgreSQL e não carrega `mysql2`. A correção sugerida pelo npm rebaixaria o Prisma para a v6
(mudança incompatível), então não foi aplicada; reavaliar a cada atualização do Prisma.
