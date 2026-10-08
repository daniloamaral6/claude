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
