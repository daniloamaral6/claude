# Passo a passo: Mercado Pago e Melhor Envio

Os nomes de menus podem mudar; se algo não bater com a tela, siga o sentido e me avise. Itens marcados com ⚠️ não consegui confirmar na documentação oficial.

## Regra de ouro das chaves
**Nunca cole token, chave ou senha no chat.** Guarde-as nas variáveis do ambiente: no menu do ambiente de nuvem da sessão (barra de título) → **Edit** → variáveis de ambiente / segredos. Use exatamente estes nomes; uma sessão nova já os enxerga. Para publicar, as mesmas variáveis vão no painel da hospedagem.

---
## PARTE 1 — Mercado Pago (Pix e cartão)

### 1.1 Conta
1. Abra uma conta Mercado Pago **da empresa (CNPJ)** em mercadopago.com.br. Pode usar o seu CPF como representante.
2. Valide a identidade e cadastre a **conta bancária da empresa**.
3. Cadastre uma **chave Pix** no app. Sem chave Pix, o Pix não funciona.
4. Ative a verificação em duas etapas (segurança).

### 1.2 Criar a aplicação
1. Acesse mercadopago.com.br/developers e entre com a conta da empresa.
2. **Suas integrações → Criar aplicação.**
3. Nome: `Afeturar Loja`. Tipo de solução: **pagamentos online** com integração própria (**Checkout Transparente / Checkout API**). Se pedir, marque que é loja virtual própria e informe o site (afeturar.com.br).
4. Conclua e abra a aplicação criada.

### 1.3 Credenciais de TESTE (comece por aqui)
1. Dentro da aplicação: **Dados da integração → Testes → Credenciais de teste.**
2. Copie e guarde nas variáveis:
   | O que é | Variável |
   |---|---|
   | **Public Key** de teste | `NEXT_PUBLIC_MERCADO_PAGO_PUBLIC_KEY` |
   | **Access Token** de teste | `MERCADO_PAGO_ACCESS_TOKEN` |
3. Aviso: o token de teste começa com `APP_USR-`, igual ao de produção. Anote qual é qual para não trocar.
4. Crie **contas de teste** (vendedor e comprador) na área de contas de teste; use a do comprador para pagar nos testes. Cartões de teste e as regras para aprovar/recusar estão na documentação do Mercado Pago (em geral o nome do titular `APRO` aprova e `OTHE` recusa) ⚠️ confirme os números atuais lá.

**Resultado da validação (24/10/2026):** Pix (QR e copia-e-cola, consulta) e cartão (aprovado, recusado e saldo insuficiente) funcionam contra a API de teste. As chaves usadas pareciam ser as da **aba Produção**: a API recusou pagamentos de teste até enviarmos o cabeçalho de teste (`MERCADO_PAGO_MODO_TESTE=true`). O correto é usar as credenciais da **aba Teste**, depois de clicar em **Ativar credenciais** no cartão "Credenciais de teste". Com elas, essa variável não é necessária.

**E-mail do comprador nos testes:** em modo de teste a API responde `400 Invalid users involved` (código 2034) se o e-mail do pagador não for de um usuário de teste. Use e-mails como `test_user_123456@testuser.com` no checkout durante os testes; compradores reais não têm essa restrição em produção.

### 1.4 Webhook (avisa a loja quando o pagamento muda)
Só dá para configurar depois que o site estiver no ar (precisa de endereço público).
1. Na aplicação: **Webhooks → Configurar notificações.**
2. URL: `https://afeturar.com.br/api/webhooks/mercadopago` (use o endereço de teste da hospedagem enquanto não for o definitivo).
3. Evento: marque **Pagamentos**.
4. Salve e **revele a assinatura secreta** → guarde em `MERCADO_PAGO_WEBHOOK_SECRET`.
5. A loja só aceita notificações com assinatura válida; sem essa variável o webhook responde "indisponível" de propósito.

### 1.5 Produção (só quando tudo estiver testado)
1. Na aplicação: **Credenciais de produção → Ativar**. O formulário pede o ramo do negócio e o endereço do site; aceite os termos e conclua.
2. Copie Public Key e Access Token de produção e **substitua** as de teste nas variáveis da hospedagem.
3. Refaça o cadastro do webhook na conta de produção e atualize `MERCADO_PAGO_WEBHOOK_SECRET`.
4. Faça uma compra real de valor baixo e estorne pelo painel do Mercado Pago (o estorno é manual).

### 1.6 O que eu testo quando as chaves de teste chegarem
Pix (QR e copia-e-cola), cartão aprovado e recusado, parcelamento, pedido cancelado por falta de pagamento, e o formulário de cartão (a política de segurança do site, em `next.config.ts`, pode precisar de ajuste).

---
## PARTE 2 — Melhor Envio (frete)

### 2.1 Conta de testes (sandbox)
1. O ambiente de testes é **separado** da conta real: cadastre-se em **sandbox.melhorenvio.com.br** ⚠️ (confirme o endereço no site).
2. Dentro da conta: **Configurações → Tokens de acesso** (ou área de desenvolvedor / aplicativos) ⚠️ → **gerar novo token**.
3. Permissões do token: marque **cálculo de frete** (`shipping-calculate`). Para o futuro (etiquetas) existem outras; por ora só esta é usada.
4. Guarde:
   | O que é | Variável |
   |---|---|
   | Token | `MELHOR_ENVIO_TOKEN` |
   | `sandbox` | `MELHOR_ENVIO_AMBIENTE` |
   | e-mail de contato da loja (vai no identificador das chamadas) | `MELHOR_ENVIO_EMAIL_CONTATO` |

### 2.2 Dados da loja (no painel da Afeturar, em Configurações)
- **CEP de origem** (de onde você posta). Sem ele não há cotação.
- Valor do **frete grátis** (opcional; confirme o valor, o do exemplo é R$ 299,00).
- Em cada produto: **peso e medidas da embalagem** (já vieram da Shopee; confira). Sem isso o produto não calcula frete.

### 2.3 Conta de produção
1. Cadastre-se em **melhorenvio.com.br** com o CNPJ, preencha o endereço de origem e os dados da empresa.
2. Gere um novo token de produção com a mesma permissão.
3. Troque `MELHOR_ENVIO_TOKEN` e coloque `MELHOR_ENVIO_AMBIENTE=producao`.
4. Para postar, **adicione saldo** na conta e compre a etiqueta pelo painel do Melhor Envio (a loja ainda não compra etiquetas sozinha).

**Resultado da validação (24/10/2026, sandbox):** o token precisa ser o JWT completo (~1000 caracteres, escopo `shipping-calculate`). Cotação funcionou para SP, RJ, BH, Salvador, Manaus, Porto Velho e interior do AM, com 1, 3 e 5 unidades (PAC, SEDEX, Jadlog .Package e .Com). Frete grátis por valor (≥ R$ 299,00) e por cupom funcionam: a opção mais barata fica grátis e as demais cobram só a diferença. Observações: o sandbox não devolve todos os serviços para todos os CEPs (ex.: SP capital sem PAC); para destinos distantes a opção grátis pode ser a mais lenta (ex.: Manaus, 17 dias) — se preferir outra regra, é decisão de negócio.

### 2.4 O que eu testo
Cotação para vários CEPs (capital, interior, longe), com kits de 3 e 5 unidades, frete grátis por valor e por cupom, e o comportamento quando o Melhor Envio fica fora do ar.

---
## PARTE 3 — E-mails (Resend), para completar
1. Crie conta em resend.com e adicione o domínio `afeturar.com.br`.
2. O Resend mostra alguns registros DNS (SPF e DKIM): cadastre no **Registro.br** (ou onde o DNS estiver).
3. Gere uma **API key** → `RESEND_API_KEY`; defina o remetente em `EMAIL_REMETENTE` (ex.: `pedidos@afeturar.com.br`, nome e endereço que existirem).

## Ordem recomendada
1. Conta Mercado Pago (CNPJ) + aplicação + credenciais de teste.
2. Conta sandbox do Melhor Envio + token.
3. Colocar as chaves nas variáveis do ambiente e me avisar → eu testo tudo em sandbox.
4. Escolher a hospedagem → configurar o webhook.
5. Só então produção.
