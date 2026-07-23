export const diarioTemplate = `
<header class="top">
  <div class="eyebrow">Diário · Acompanhamento</div>
  <h1>Peso, calorias e nutrientes</h1>
  <div class="today-date" id="todayDate"></div>
</header>

<section class="card" id="heroCard">
  <h2>Evolução do peso</h2>
  <div id="heroContent">Carregando…</div>
</section>

<section class="card">
  <h2>Registrar peso</h2>
  <form class="log-form" id="pesoForm">
    <div class="field full">
      <label for="fp-date">Data</label>
      <input type="date" id="fp-date" required>
    </div>
    <div class="field full">
      <label for="fp-peso">Peso (kg)</label>
      <input type="number" id="fp-peso" step="0.1" min="0" required>
    </div>
    <button type="submit" class="primary">Salvar peso</button>
  </form>
</section>

<section class="card">
  <h2>Analisar refeição por foto</h2>
  <input type="file" id="photoInput" accept="image/*" capture="environment" style="display:none;">
  <label for="photoInput" class="photo-btn-label">Escolher ou tirar foto</label>
  <div id="photoPreviewWrap"></div>
  <button id="analyzeBtn" class="primary" disabled style="margin-top:10px;">Analisar foto</button>
  <p class="photo-caption">Estimativa gerada por IA a partir da imagem — pode não ser exata, principalmente em pratos com vários itens misturados. Você pode ajustar os valores antes de adicionar. O valor é somado ao consumo já registrado hoje.</p>
  <div id="analysisResult"></div>
</section>

<section class="card">
  <h2>Água e suplementos de hoje</h2>
  <form class="log-form" id="extrasForm">
    <div class="field full">
      <label for="f-agua">Água (L)</label>
      <input type="number" id="f-agua" step="0.1" min="0">
    </div>
    <div class="toggles">
      <label class="toggle" id="toggleWhey">
        <input type="checkbox" id="f-whey">
        <span class="dot"></span> Whey
      </label>
      <label class="toggle" id="toggleCreatina">
        <input type="checkbox" id="f-creatina">
        <span class="dot"></span> Creatina
      </label>
    </div>
    <button type="submit" class="primary">Salvar</button>
  </form>
</section>

<section class="card">
  <h2>Metas de hoje</h2>
  <div id="progressContent">Carregando…</div>
  <button class="settings-toggle" id="settingsToggle">Ajustar metas</button>
  <div class="settings-panel" id="settingsPanel">
    <div class="log-form">
      <div class="field">
        <label for="m-calorias">Calorias (kcal)</label>
        <input type="number" id="m-calorias" step="10" min="0">
      </div>
      <div class="field">
        <label for="m-proteina">Proteína (g)</label>
        <input type="number" id="m-proteina" step="1" min="0">
      </div>
      <div class="field">
        <label for="m-sodio">Sódio (mg)</label>
        <input type="number" id="m-sodio" step="50" min="0">
      </div>
      <div class="field">
        <label for="m-agua">Água (L)</label>
        <input type="number" id="m-agua" step="0.1" min="0">
      </div>
    </div>
    <button class="primary" id="saveMetas" style="width:100%;">Salvar metas</button>
    <p class="settings-caption">Valores padrão com base no que conversamos: ~2400 kcal, proteína alta para preservar massa muscular, sódio reduzido pela pressão alta, água entre 2,5–3L.</p>
  </div>
</section>

<section class="card">
  <h2>Evolução — calorias e nutrientes</h2>
  <div class="tabs" id="nutrientTabs">
    <button class="tab-btn active" data-key="calorias" type="button">Calorias</button>
    <button class="tab-btn" data-key="proteina" type="button">Proteína</button>
    <button class="tab-btn" data-key="sodio" type="button">Sódio</button>
    <button class="tab-btn" data-key="agua" type="button">Água</button>
  </div>
  <div id="nutrientChartWrap">Carregando…</div>
</section>

<section class="card">
  <h2>Histórico</h2>
  <div id="historyContent">Carregando…</div>
</section>
`;
