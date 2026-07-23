export const hojeTemplate = `
<header class="top">
  <div class="eyebrow">Hoje</div>
  <h1>Resumo do dia</h1>
  <div class="today-date" id="hojeDate"></div>
</header>

<section class="card">
  <h2>Peso</h2>
  <div id="hojePesoContent">Carregando…</div>
</section>

<section class="card">
  <h2>Metas de hoje</h2>
  <div id="hojeMetasContent">Carregando…</div>
</section>

<section class="card">
  <h2>Insights de IA</h2>
  <button class="primary" id="hojeInsightsBtn" disabled>Atualizar insights (em breve)</button>
  <p class="settings-caption">Vai cruzar tendência de peso, aderência às metas, exames fora da faixa, sono e humor assim que esses módulos existirem no Diário e no Mais.</p>
</section>
`;
