# Diário de Saúde

Assistente pessoal de saúde (peso, treino, exames), migrado do protótipo em HTML único
(artifact do Claude.ai) para um projeto real com backend próprio.

## Estrutura

```
server/   Node.js + Express + SQLite. Guarda os dados e faz o proxy para a API da Anthropic
          (a chave nunca fica exposta no navegador).
web/      Frontend em JavaScript puro (módulos ES), empacotado com Vite. PWA instalável.
data/     Arquivo SQLite (saude.db) — não versionado.
```

## Rodando localmente

1. Instale as dependências (na raiz, cobre os dois workspaces):
   ```
   npm install
   ```
2. Copie `server/.env.example` para `server/.env` e coloque sua chave da Anthropic:
   ```
   cp server/.env.example server/.env
   ```
3. Aplique o schema do banco (cria `data/saude.db`):
   ```
   npm run migrate
   ```
4. Suba backend e frontend juntos em modo dev:
   ```
   npm run dev
   ```
   O frontend fica em `http://localhost:5173` (proxying `/api` para o backend em `:3001`).

## Build de produção

```
npm run build   # gera web/dist
npm start        # sobe o Express, que passa a servir o web/dist também
```

Para instalar como PWA no celular, o servidor de produção precisa estar em HTTPS
(localhost funciona sem certificado; num deploy real, um proxy como Caddy resolve isso
automaticamente).

## O que já foi migrado

- **Diário**: peso (com gráfico), análise de refeição por foto via IA, água/suplementos,
  metas com barras de progresso, gráficos de calorias/nutrientes, histórico
- **Treino**: força (carga por exercício) e cardio (tempo/distância), com gráficos de
  evolução e histórico combinado
- **Exames**: upload de PDF analisado por IA, exames de sangue (agrupados, com faixa de
  referência) e de imagem (conclusão extraída)
- **Medicamentos**: cadastro de remédios (com sugestões pré-preenchidas para Mounjaro,
  Losartana, Vitamina D3 e Pantogar Neo), registro de doses aplicadas (local, efeitos
  colaterais) e cálculo automático da próxima dose para medicamentos com intervalo definido
- **Hoje**: dashboard simples com peso atual e metas do dia (insights de IA ainda não
  implementados — depende dos módulos futuros)
- **Mais**: grade com os próximos módulos do roadmap (ver `arquitetura_app_saude.md`
  original para o plano completo)

## Próximos passos sugeridos

Seguir a ordem de "bom senso" da arquitetura original: Medidas corporais + Fotos de
evolução, Sono/Humor/Sintomas, Hábitos/Objetivos/Conquistas, Timeline + Relatórios,
Receitas + Lista de compras. Cada módulo novo ganha sua própria tabela em
`server/src/db/schema.sql` e sua própria pasta em `web/src/views/`.
