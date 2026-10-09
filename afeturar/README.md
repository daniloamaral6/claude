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
| Logo `public/brand/logo-circular.webp` | Enviado pela cliente, **sem alteração**. WebP 1254×1254 com fundo opaco (cantos brancos); mesma arte do JPEG do kit (só muda a compressão); não é vetor |
| Símbolo `public/brand/simbolo-transparente.webp` | Enviado pela cliente, **sem alteração**. WebP 1536×1024 com **fundo transparente** (A + coração + cubo, sem o nome) |
| Cores `--color-creme/marrom/terracota-escuro/terracota/cobre` | **Aproximadas**, medidas no JPEG; não são oficiais (`src/app/globals.css`) |
| Cores `creme-profundo`, `linha`, `marrom-suave`, `acao-hover`, `erro` | **Proposta nova** deste projeto |
| Slogan "Dê forma ao que você sente." | Observado no logo |
| Tipografia | Fonte da marca **não identificada**. Usamos a pilha de fontes do sistema (proposta provisória) |
| Favicon / ícone de app | `src/app/icon.png` e `apple-icon.png` **gerados a partir do símbolo enviado** (apenas recorte da área visível e centralização em tela quadrada; o desenho não foi alterado). **Proposta** — sujeita à aprovação |
| Foto de ambiente, fotos de produtos | **Faltam**; não usamos as capturas do kit |

Contraste medido (WCAG): marrom/creme 12,3:1; creme sobre terracota escuro (botão) 6,9:1 (AA);
terracota `#C1846F` (2,9:1) e cobre `#D89477` (2,3:1) **não** servem para texto — só detalhes decorativos.

O logo é exibido recortado em círculo por CSS (`rounded-full`) para esconder os cantos brancos do JPEG;
o arquivo não é modificado, e o recorte fica fora do anel do desenho.

## Pendências de arquivos
Logo em vetor (SVG), tipografia da marca, manual/paleta oficial, fotos reais, número de WhatsApp,
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

## Fase 2 — painel administrativo real (banco local)

Substitui o protótipo do admin por um painel que lê e grava no banco. A loja pública ainda usa dados de exemplo (Fase 3).

**Rodando**
```
npm run db:migrate && npm run db:seed
ADMIN_EMAIL=voce@exemplo.com ADMIN_SENHA='uma senha forte' npm run admin:criar   # não existe usuário padrão
npm run dev        # painel em http://localhost:3000/admin
```
A senha não é gravada em arquivo. Política: 10+ caracteres, sem conter o e-mail.

**O que o painel faz:** login; dashboard com indicadores reais (faturamento só de pedidos pagos); produtos (rascunho → fotos → publicar,
variações com SKU/preço/estoque/prazo, personalização, dimensões, embalagem, SEO); fotos (JPG/PNG/WebP até 5 MB, ordem, principal);
categorias e subcategorias; cores (novas cores sem código); pedidos (7 status com fluxo permitido, rastreio, histórico);
configurações (WhatsApp, e-mail, CNPJ validado, redes, CEP de origem, frete grátis). Papéis: ADMIN (tudo) e EQUIPE (sem Configurações).

**Segurança**
- Senhas com scrypt (custo 2^15) e comparação em tempo constante; mensagem de erro genérica; bloqueio de 15 min após 5 falhas.
- Sessão no banco guardando só o **hash** do token; cookie `httpOnly`, `SameSite=Lax`, `Secure` + prefixo `__Host-` em produção; expira em 7 dias; desativar a conta derruba as sessões.
- Duas barreiras: `proxy.ts` (sem cookie → login) e `exigirPainel()` em **toda** página e ação (valida no banco e no papel).
- Todos os dados são revalidados no servidor (zod + regras de negócio + CHECK no banco). Server Actions já conferem a origem da requisição (proteção CSRF do Next).
- Upload: tipo detectado pelo **conteúdo** (não pelo nome), limite de 5 MB, nome aleatório, SVG/HTML recusados, entrega com `nosniff` e CSP restritiva, sem navegação de pastas.
- Cabeçalhos de segurança (`X-Frame-Options`, `nosniff`, `Referrer-Policy`) e `Cache-Control: no-store` no painel; log de auditoria das alterações.

**Limites conhecidos (a tratar antes da publicação):** fotos ficam em disco local (`storage/`, ignorado pelo git) — em produção usar Cloudflare R2/Cloudinary
(trocar apenas `src/server/armazenamento.ts`); o bloqueio de login é por conta (adicionar limite por IP/CDN na publicação); autenticação em dois fatores e
recuperação de senha ficam para depois; cancelar pedido ainda não devolve estoque (entra com o checkout, Fase 4).

**Testes:** `npm test` — 84 testes automatizados (regras do banco, login/sessão, produtos, fotos, pedidos, configurações, formulários).
Os testes e2e do navegador foram executados manualmente com Playwright; capturas em `docs/painel/` (dados de teste, não reais).

## Catálogo: planilha modelo e importador

`docs/catalogo/modelo-catalogo-afeturar.xlsx` — modelo para preencher o catálogo (uma linha por variação), já com os **27 produtos extraídos do app
"Afeturar — Gestão de produção"** (nome, categoria, preço sugerido e peso da peça). **Não** foram copiados custo, margem, filamento, impressora nem tempo
de impressão (dados internos). Cores: amarelo = preencher · azul = sugestão para confirmar · cinza = referência do app (não importada).

```
npm run catalogo:importar -- planilha.xlsx                                        # simula e lista erros por linha (não grava)
npm run catalogo:importar -- planilha.xlsx --fotos ./fotos --aplicar --admin voce@exemplo.com
```
Tudo entra como **rascunho**; publicar é um passo manual no painel. Idempotente (produto com o mesmo nome é ignorado), cores novas são criadas,
SKU em branco é gerado (`AFT-0001…`), fotos são validadas como no painel. Código em `src/server/importacao*.ts`.

## Fase 3 — loja ligada ao banco

A loja pública agora lê do banco; o protótipo com dados de exemplo foi removido.

- **Vitrine:** home (categorias do banco, Novidades, Em destaque, Mais vendidos — cada seção some quando está vazia), categorias com subcategorias,
  `/loja`, `/lancamentos`, busca. Filtros (disponibilidade, cor, promoção), ordenação e paginação ficam na **URL** (funcionam sem JavaScript e podem ser compartilhados).
- **Regras** (`src/lib/preco.ts`, testadas): variação pode ter preço próprio; promoção só vale se for menor que o preço; pronta entrega exige estoque, sob encomenda não;
  limite de 20 por item; o estoque exato nunca vai para o navegador (só "restam N" quando ≤ 3).
- **Produto:** cor/tamanho com disponibilidade por opção, foto por variação, personalização, "Comprar agora"/"Adicionar ao carrinho", compartilhar, WhatsApp (só se configurado),
  dados estruturados `Product` (JSON-LD), canonical, Open Graph.
- **Carrinho** (`src/server/carrinho.ts`): persistente no banco, por cookie `httpOnly` com token aleatório (no banco só o hash), 30 dias. **Preços e disponibilidade sempre vêm do banco.**
  Mesmo produto com personalizações diferentes = linhas diferentes. Itens que esgotam/despublicam são sinalizados, saem do total e há "Ajustar carrinho".
- **Favoritos:** ficam no aparelho (localStorage) até existir login de cliente.
- **Busca:** índice normalizado (sem acento/maiúscula), casa no início das palavras, curingas (`%`, `_`) neutralizados.
- **SEO:** `sitemap.xml` (só produtos/categorias/páginas publicados), `robots.txt` (bloqueia tudo enquanto `NEXT_PUBLIC_INDEXAR` ≠ `true`), páginas de busca/filtros/carrinho não indexadas.
- **Páginas institucionais** vêm do banco (`PaginaInstitucional`, texto simples) e só aparecem quando publicadas.

**Ainda NÃO existe (próximas fases):** cálculo de frete por CEP, cadastro/login de cliente, checkout real (a tela é ilustrativa e usa o subtotal real do carrinho),
pagamento, edição de banners/páginas/cupons no painel, avaliações, recuperação de carrinho.

Testes: `npm test` (113+ testes, incluindo regras de preço, catálogo público, busca, carrinho e importador). Capturas em `docs/loja/` (dados **fictícios** de desenvolvimento).
