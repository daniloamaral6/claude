# Revisão de segurança, desempenho e SEO

Feita sobre o build de produção (`next build` + `next start`) com o catálogo da Shopee importado. Data: 24/10/2026.

## Segurança

**Corrigido**
- **Dependências:** `npm audit` apontava 9 vulnerabilidades (1 crítica, 5 altas). A crítica era do **Next.js** (execução remota de código na otimização de imagens com SVG e negação de serviço em Server Actions, versões 16.0.0–16.4.0). Atualizado para Next 16.4.3, Zod 4.6.7 e dependências do Prisma. O site não habilita SVG na otimização de imagens.
- **Cabeçalhos em produção:** `Content-Security-Policy` (scripts/estilos só do próprio site e do Mercado Pago, `frame-ancestors 'none'`, `object-src 'none'`, `form-action 'self'`) e `Strict-Transport-Security`. Verificado no navegador: nenhuma violação de CSP nas páginas da loja, carrinho, checkout, conta e login do painel.
- Páginas privadas (`/pedido`, `/acompanhar-pedido`) saem do índice dos buscadores.

**Já estava certo (confirmado)**
- Sem SQL montado por texto: o SQL "cru" usa só parâmetros. Sem `dangerouslySetInnerHTML` além do JSON-LD (com `<` escapado).
- Cookies `httpOnly`, `SameSite=Lax` e `Secure` em produção; sessão guardada como hash; bloqueio após 5 falhas; senha com scrypt.
- Todas as ações do painel exigem sessão e papel; redirecionamentos só para caminhos internos.
- Upload valida o tipo pelos bytes (JPG/PNG/WebP, 5 MB; SVG recusado) e a rota `/media` só aceita nomes UUID com `sandbox` e `nosniff`.
- Webhook do Mercado Pago com assinatura, `cron` com segredo, rota de pagamento simulado inexistente em produção.
- `.env` fora do Git.

**Aceito / a acompanhar**
- `uuid` (moderada) via `exceljs`, usado só na importação de planilhas pelo painel; o defeito só ocorre quando se passa um buffer, o que o `exceljs` não faz. Sem correção sem quebrar a importação.
- **CSP e Mercado Pago:** os domínios liberados são os documentados, mas **precisam ser validados com o Brick de cartão real** quando houver as chaves de teste. Se o cartão não abrir, o primeiro lugar a olhar é a CSP em `next.config.ts`.
- Limite de tentativas é em memória, por instância, e lê o IP de `x-forwarded-for`. Só é confiável atrás de um proxy que sobrescreve esse cabeçalho (hospedagem/CDN). Para produção, adicionar limite no provedor.
- Sem verificação de e-mail no cadastro e sem estorno automático (ver README, Fase 4).

## Desempenho

Medido em produção local (banco local, portanto sem latência de rede):
- Resposta do servidor 30–90 ms; LCP ≈ 200 ms; imagens servidas em WebP pelo otimizador do Next; 23 de 25 imagens da home com carregamento preguiçoso; índices do banco cobrem as consultas do catálogo.
- **Corrigido:** cada página disparava de 31 a 49 pré-carregamentos (cada um renderiza uma página no servidor e consulta o banco). Desligados nos cartões de produto, rodapé, menus e blocos de categoria: **caiu para 10–15** por visita.

**Cache da vitrine (feito em 24/10/2026)**
- Os dados públicos (categorias, produtos, listas da home, cores do filtro, configurações do rodapé) ficam em cache por até 60 s. Em 30 visitas seguidas a home, a loja e um produto, o banco recebeu **2 transações** (antes, dezenas). Resposta da home ≈ 20 ms.
- O cache é apagado **na hora** quando o painel salva produto, foto, categoria, cor, configuração ou pedido, e quando um pedido é criado, pago/cancelado pelo Mercado Pago ou expirado (estoque). Testado: alterei a cor de uma bolinha no painel e a loja já mostrou o novo tom na visita seguinte.
- Não são guardados: resultado "não encontrado" (endereços inexistentes não enchem o cache), buscas digitadas, o carrinho e as páginas de pedido/conta. O preço e o estoque são sempre conferidos de novo no checkout.
- As páginas continuam sendo montadas a cada visita (o cabeçalho mostra o carrinho de cada pessoa); o ganho está em não consultar o banco. Quando a loja tiver tráfego grande, o próximo passo é guardar também o HTML (exige tirar o carrinho do cabeçalho).
- Com mais de um servidor, cada um tem seu próprio cache de 60 s; a invalidação instantânea vale no servidor que recebeu a alteração. Para vários servidores, usar um cache compartilhado (decisão de hospedagem).

**A fazer depois**
- O build avisa que a leitura de fotos do disco (`armazenamento.ts`) faz o Next rastrear o projeto inteiro. Inofensivo; vira problema ao trocar para armazenamento em nuvem (decisão de hospedagem).
- Fotos da Shopee têm no máximo 1024 px; para telas grandes e zoom, usar os originais.

## SEO

**Corrigido**
- JSON-LD do produto com descrição em uma linha; **BreadcrumbList** no produto; **Organization** e **WebSite** (com busca do site) na home. Só dados reais: sem telefone, endereço ou avaliações inventadas.
- `robots.txt` bloqueia também `/pedido` e `/acompanhar-pedido`.

**Já estava certo**
- `lang="pt-BR"`, um `h1` por página, título e descrição por produto, URL canônica, Open Graph e Twitter, `alt` em todas as imagens, sitemap só com itens publicados, 404 real para produto inexistente, e tudo bloqueado para buscadores até `NEXT_PUBLIC_INDEXAR=true`.

**A fazer**
- Preencher título/descrição SEO dos produtos no painel (hoje usa o início da descrição).
- Disponibilidade no JSON-LD: produtos sob encomenda aparecem como "em estoque"; se quiser tratar diferente, defina o termo.
- Cadastrar o site no Google Search Console e enviar o sitemap só depois de publicar; ligar `NEXT_PUBLIC_INDEXAR=true` apenas no site real.
- Páginas institucionais (Sobre, políticas) ainda precisam de texto real.
