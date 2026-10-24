# Checklist para publicar a loja Afeturar

Legenda: **[Você]** só você pode fazer · **[Eu]** posso fazer na sessão · **[Juntos]** exige os dois. Nada é publicado sem a sua autorização.

## 1. Contas e chaves (bloqueia o pagamento e o frete)
- [ ] **[Você]** Criar a conta Mercado Pago com o CNPJ, validar identidade e conta bancária, cadastrar chave Pix.
- [ ] **[Você]** Criar a aplicação "Checkout Transparente" e pegar Public Key, Access Token e (depois) a assinatura do webhook. Primeiro as de **teste**.
- [ ] **[Você]** Criar conta no Melhor Envio (sandbox primeiro) e gerar o token; depois a conta de produção com o CNPJ e o endereço de origem.
- [ ] **[Você]** Criar conta no Resend (e-mails) e cadastrar o domínio.
- [ ] **[Você]** Colocar as chaves nas **variáveis secretas** do ambiente (nunca no chat nem no Git).
- [ ] **[Eu]** Testar de verdade em sandbox: Pix, cartão aprovado/recusado, cotação de frete, webhook. Corrigir o que as APIs reais mostrarem diferente (hoje só foi testado com respostas simuladas).
- [ ] **[Eu]** Conferir a CSP com o formulário de cartão real (`next.config.ts`).

## 2. Hospedagem e domínio (afeturar.com.br)
- [ ] **[Você]** Escolher a hospedagem que aceita Next.js (Node) e PostgreSQL, e o plano. Há um conector da Hostinger nesta sessão, se for o caso.
- [ ] **[Você]** Apontar o domínio (DNS no Registro.br) para a hospedagem e ativar HTTPS.
- [ ] **[Você]** DNS do Resend (SPF e DKIM) para os e-mails saírem de @afeturar.com.br.
- [ ] **[Juntos]** Banco PostgreSQL de produção, com **backup automático diário** e teste de restauração.
- [ ] **[Juntos]** Pasta/armazenamento **persistente** para as fotos (disco da hospedagem ou armazenamento em nuvem). Sem isso as fotos somem a cada nova versão.
- [ ] **[Juntos]** Agendar a rotina `/api/cron/expirar-pedidos` (a cada ~10 min) com `CRON_SECRET`.
- [ ] **[Eu]** Rodar `prisma migrate deploy` em produção e criar o primeiro administrador (`scripts/criar-admin.ts`) com senha forte própria. **Não levar os usuários e dados de teste.**
- [ ] **[Eu]** Webhook do Mercado Pago apontando para `https://afeturar.com.br/api/webhooks/mercadopago` e variáveis de produção.
- [ ] **[Juntos]** Alerta de erros e de site fora do ar (monitoramento simples).

## 3. Catálogo (os 12 produtos estão como rascunho)
- [ ] **[Você]** Revisar descrição, preço, categoria e cores de cada produto; confirmar que os preços do site são os da Shopee (que embutem tarifas) ou definir outros.
- [ ] **[Você]** Preencher **prazo de preparo** e **medidas da peça**; conferir peso e embalagem usados no frete.
- [ ] **[Você]** Confirmar que as fotos são suas ou autorizadas; ideal enviar originais maiores que 1024 px.
- [ ] **[Você]** Título e descrição de busca (SEO) de cada produto.
- [ ] **[Você]** Revisar cores combinadas (ex.: "Marrom e dourado" × "Dourado e marrom") e os tons das bolinhas.
- [ ] **[Eu]** Refazer a importação e as fotos no banco de produção, como rascunho, e apagar os produtos de teste.
- [ ] **[Você]** Publicar cada produto no painel quando estiver aprovado.

## 4. Dados da empresa e textos legais (nada disso foi inventado)
- [ ] **[Você]** WhatsApp, e-mail de atendimento, CNPJ, endereço e redes sociais (painel → Configurações).
- [ ] **[Você]** CEP de origem do frete e valor do frete grátis (hoje a faixa do topo usa R$ 299,00 como exemplo: confirme ou altere).
- [ ] **[Você]** Textos reais de: Sobre, Perguntas frequentes, Política de privacidade, Termos de uso, Trocas e devoluções, Política de entrega. Recomendo revisão por quem entende de direito do consumidor e LGPD.
- [ ] **[Você]** Definir quem responde pelos dados (LGPD) e como o cliente pede exclusão/correção.
- [ ] **[Você]** Combinar com o contador: emissão de nota fiscal e enquadramento (o sistema não emite NF-e).
- [ ] **[Eu]** Se você quiser medir visitas (Google Analytics, Meta Pixel), incluir **aviso de cookies com consentimento**. Hoje só há cookies essenciais (sessão e carrinho) e nenhum rastreador.

## 5. Testes finais antes de abrir
- [ ] **[Eu]** Compra completa em sandbox (Pix e cartão), com cupom, e cancelamento pelo painel.
- [ ] **[Você]** Compra de teste real de valor baixo em produção (e estorno pelo painel do Mercado Pago, que é manual).
- [ ] **[Eu]** Conferir e-mails (pedido criado, pago, enviado, cancelado) chegando e sem cair no spam.
- [ ] **[Eu]** Revisão no celular das páginas principais e do checkout.
- [ ] **[Eu]** Rodar de novo lint, tipos, testes, `npm audit` e o build de produção.
- [ ] **[Você]** Definir o processo do dia a dia: quem vê os pedidos, quem compra a etiqueta no Melhor Envio, quem faz o estorno.

## 6. Abrir
- [ ] **[Eu]** Ligar `NEXT_PUBLIC_INDEXAR=true` e conferir `robots.txt` e `sitemap.xml`.
- [ ] **[Você]** Cadastrar o site no Google Search Console e enviar o sitemap; criar o perfil no Google Meu Negócio, se fizer sentido.
- [ ] **[Você]** Divulgar (Instagram, WhatsApp, Shopee).

## Limites conhecidos depois de publicar (não bloqueiam, mas planeje)
- Sem estorno automático (feito à mão no Mercado Pago) e sem emissão de etiqueta pela loja (compra no Melhor Envio).
- Sem verificação de e-mail no cadastro; limite de tentativas por servidor, dependente do proxy da hospedagem.
- Sem vídeo de produto na loja; sem avaliações de clientes; sem cálculo de impostos.
- Cache de 60 s por servidor (ver `revisao-seguranca-desempenho-seo.md`).
