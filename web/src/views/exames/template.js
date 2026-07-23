export const examesTemplate = `
<header class="top">
  <div class="eyebrow">Exames · Laudos</div>
  <h1>Resultados ao longo do tempo</h1>
  <div class="today-date">Registre valores de exames para acompanhar a evolução</div>
</header>

<section class="card">
  <h2>Enviar exame</h2>
  <input type="file" id="examPdfInput" accept="application/pdf" style="display:none;">
  <label for="examPdfInput" class="photo-btn-label">Escolher PDF do exame</label>
  <div id="examFilePreview"></div>
  <button id="analyzeExamBtn" class="primary" disabled style="margin-top:10px;">Analisar exame</button>
  <p class="photo-caption">Envie o PDF do laudo — de sangue ou de imagem (ultrassonografia, ecocardiograma, endoscopia, doppler, MAPA, etc). A IA identifica o tipo e extrai os dados automaticamente. Confira e ajuste se necessário antes de salvar.</p>
  <div id="examAnalysisResult"></div>
</section>

<section class="card">
  <h2>Exames de sangue</h2>
  <div id="bloodExamsContent">Carregando…</div>
</section>

<section class="card">
  <h2>Imagem</h2>
  <div id="imagingExamsContent">Carregando…</div>
</section>
`;
