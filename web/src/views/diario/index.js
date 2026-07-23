import { api } from '../../api.js';
import { todayISO, fmtDatePt, fmtNum, showToast, parseFloatOrNull, fileToResizedBase64 } from '../../utils.js';
import { buildLineChartSVG, buildBarChartSVG } from '../../components/chart.js';
import { diarioTemplate } from './template.js';

const METRICS = [
  { key: 'calorias', label: 'Calorias', unit: 'kcal', metaKey: 'calorias', type: 'max' },
  { key: 'proteina', label: 'Proteína', unit: 'g', metaKey: 'proteina', type: 'min' },
  { key: 'sodio', label: 'Sódio', unit: 'mg', metaKey: 'sodio', type: 'max' },
  { key: 'agua', label: 'Água', unit: 'L', metaKey: 'agua', type: 'min' }
];

let entries = [];
let metas = { calorias: 2400, proteina: 140, sodio: 2000, agua: 2.8 };
let activeNutrientKey = 'calorias';
let currentPhotoBase64 = null;
let currentPhotoMediaType = null;
let container;

function getEntry(date) {
  return entries.find((e) => e.date === date);
}

function renderHero() {
  const el = container.querySelector('#heroContent');
  const withPeso = entries.filter((e) => e.peso != null);

  if (withPeso.length === 0) {
    el.innerHTML = '<p class="chart-empty">Ainda sem registros de peso. Assim que você salvar o primeiro, o gráfico aparece aqui.</p>';
    return;
  }

  const last = withPeso[withPeso.length - 1];
  const first = withPeso[0];
  const delta = first.peso - last.peso;
  const deltaClass = delta > 0.05 ? 'down' : (delta < -0.05 ? 'up' : 'flat');
  const deltaSign = delta > 0.05 ? '−' : (delta < -0.05 ? '+' : '');
  const deltaTxt = deltaClass === 'flat' ? 'estável' : (deltaSign + fmtNum(Math.abs(delta)) + ' kg');

  let html = `<div class="hero-num">
    <span class="val">${fmtNum(last.peso)} kg</span>
    <span class="delta ${deltaClass}">${deltaTxt}${withPeso.length > 1 ? ' desde o início' : ''}</span>
  </div>`;

  if (withPeso.length >= 2) {
    html += buildLineChartSVG(withPeso, 'peso', { showMinMax: true });
  } else {
    html += '<p class="chart-axis-label" style="margin-top:6px;">Registre mais um dia para ver a linha de evolução.</p>';
  }

  el.innerHTML = html;
}

function renderProgress() {
  const el = container.querySelector('#progressContent');
  const today = getEntry(todayISO());

  if (!today) {
    el.innerHTML = '<p class="empty-note">Nenhum registro hoje ainda. Analise uma foto da refeição (ou registre água/suplementos) para acompanhar as metas.</p>';
    return;
  }

  el.innerHTML = METRICS.map((m) => {
    const val = today[m.key] != null ? Number(today[m.key]) : 0;
    const meta = Number(metas[m.metaKey]) || 1;
    const pct = Math.max(0, Math.min(1, val / meta));
    const over = val > meta;
    const note = m.type === 'max'
      ? (over ? `acima da meta em ${fmtNum(val - meta)} ${m.unit}` : `${fmtNum(meta - val)} ${m.unit} de margem`)
      : (val >= meta ? 'meta atingida' : `faltam ${fmtNum(meta - val)} ${m.unit}`);
    const barClass = (m.type === 'max' && over) ? 'bar-fill over' : 'bar-fill';

    return `<div class="metric-row">
      <div class="metric-top">
        <span class="metric-name">${m.label}</span>
        <span class="metric-vals">${fmtNum(val)} / ${fmtNum(meta)} ${m.unit}</span>
      </div>
      <div class="bar-track"><div class="${barClass}" style="width:${(pct * 100).toFixed(0)}%;"></div></div>
      <div class="metric-note">${note}</div>
    </div>`;
  }).join('');
}

function renderNutrientChart() {
  const cfg = METRICS.find((m) => m.key === activeNutrientKey);
  const wrap = container.querySelector('#nutrientChartWrap');
  const target = Number(metas[cfg.metaKey]) || 1;
  const svg = buildBarChartSVG(entries, cfg, target);
  if (!svg) {
    wrap.innerHTML = `<p class="chart-empty">Ainda sem registros de ${cfg.label.toLowerCase()} para mostrar aqui. A linha tracejada vai marcar a meta assim que houver dados.</p>`;
    return;
  }
  wrap.innerHTML = svg;
}

function renderHistory() {
  const el = container.querySelector('#historyContent');
  if (entries.length === 0) {
    el.innerHTML = '<p class="empty-note">Seus registros salvos vão aparecer aqui.</p>';
    return;
  }
  const reversed = entries.slice().reverse();
  el.innerHTML = reversed.map((e) => {
    let badges = '';
    if (e.whey) badges += '<span class="badge">Whey</span>';
    if (e.creatina) badges += '<span class="badge">Creatina</span>';
    const vals = [];
    if (e.peso != null) vals.push(fmtNum(e.peso) + 'kg');
    if (e.calorias) vals.push(fmtNum(e.calorias) + 'kcal');
    if (e.proteina) vals.push(fmtNum(e.proteina) + 'g prot');
    if (e.sodio) vals.push(fmtNum(e.sodio) + 'mg Na');
    if (e.agua) vals.push(fmtNum(e.agua) + 'L');
    return `<div class="hist-row">
      <span class="hist-date">${fmtDatePt(e.date)}</span>
      <span class="hist-vals">${vals.join(' · ') || '—'}</span>
      <span class="hist-badges">${badges}</span>
      <button class="del-btn" data-date="${e.date}" aria-label="Excluir registro de ${e.date}">×</button>
    </div>`;
  }).join('');

  el.querySelectorAll('.del-btn').forEach((btn) => {
    btn.addEventListener('click', async () => {
      const date = btn.getAttribute('data-date');
      await api.diario.deleteEntry(date);
      entries = entries.filter((e) => e.date !== date);
      renderAll();
      showToast('Registro removido');
    });
  });
}

function renderAll() {
  renderHero();
  renderProgress();
  renderNutrientChart();
  renderHistory();
}

function setToggle(wrapId, inputId, on) {
  container.querySelector('#' + inputId).checked = on;
  container.querySelector('#' + wrapId).classList.toggle('on', on);
}

function initToggle(wrapId, inputId) {
  const wrap = container.querySelector('#' + wrapId);
  const input = container.querySelector('#' + inputId);
  wrap.addEventListener('click', () => {
    input.checked = !input.checked;
    wrap.classList.toggle('on', input.checked);
  });
}

function fillPesoField(dateStr) {
  const e = getEntry(dateStr) || {};
  container.querySelector('#fp-peso').value = e.peso != null ? e.peso : '';
}

function fillExtras(dateStr) {
  const e = getEntry(dateStr) || {};
  container.querySelector('#f-agua').value = e.agua != null ? e.agua : '';
  setToggle('toggleWhey', 'f-whey', !!e.whey);
  setToggle('toggleCreatina', 'f-creatina', !!e.creatina);
}

function resetPhotoUI() {
  currentPhotoBase64 = null;
  currentPhotoMediaType = null;
  container.querySelector('#photoInput').value = '';
  container.querySelector('#photoPreviewWrap').innerHTML = '';
  container.querySelector('#analysisResult').innerHTML = '';
  container.querySelector('#analyzeBtn').disabled = true;
}

function renderAnalysisResult(parsed) {
  const resultEl = container.querySelector('#analysisResult');
  const confMap = { baixa: 'Confiança baixa', media: 'Confiança média', média: 'Confiança média', alta: 'Confiança alta' };
  const confLabel = confMap[parsed.confianca] || 'Estimativa';

  resultEl.innerHTML = `<div class="analysis-card">
    <div class="analysis-desc">${parsed.descricao || 'Prato analisado'}</div>
    <span class="conf-badge">${confLabel}</span>
    ${parsed.observacao ? `<p class="analysis-obs">${parsed.observacao}</p>` : ''}
    <div class="log-form" style="margin-top:10px;">
      <div class="field"><label for="a-calorias">Calorias (kcal)</label><input type="number" id="a-calorias" value="${Math.round(parsed.calorias || 0)}"></div>
      <div class="field"><label for="a-proteina">Proteína (g)</label><input type="number" id="a-proteina" value="${Math.round(parsed.proteina_g || 0)}"></div>
      <div class="field full"><label for="a-sodio">Sódio (mg)</label><input type="number" id="a-sodio" value="${Math.round(parsed.sodio_mg || 0)}"></div>
    </div>
    <div class="btn-row">
      <button class="btn-secondary" id="discardAnalysis" type="button">Descartar</button>
      <button class="btn-primary-inline" id="addAnalysis" type="button">Adicionar ao dia</button>
    </div>
  </div>`;

  resultEl.querySelector('#discardAnalysis').addEventListener('click', resetPhotoUI);
  resultEl.querySelector('#addAnalysis').addEventListener('click', async () => {
    const add = {
      calorias: Number(resultEl.querySelector('#a-calorias').value) || 0,
      proteina: Number(resultEl.querySelector('#a-proteina').value) || 0,
      sodio: Number(resultEl.querySelector('#a-sodio').value) || 0
    };
    const dateStr = todayISO();
    const existing = getEntry(dateStr) || { date: dateStr, peso: null, calorias: 0, proteina: 0, sodio: 0, agua: 0, whey: false, creatina: false };
    const patch = {
      peso: existing.peso,
      calorias: (Number(existing.calorias) || 0) + add.calorias,
      proteina: (Number(existing.proteina) || 0) + add.proteina,
      sodio: (Number(existing.sodio) || 0) + add.sodio,
      agua: existing.agua,
      whey: existing.whey,
      creatina: existing.creatina
    };
    const saved = await api.diario.upsertEntry(dateStr, patch);
    upsertLocalEntry(saved);
    renderAll();
    resetPhotoUI();
    showToast('Adicionado ao registro de ' + fmtDatePt(dateStr));
  });
}

async function analyzePhoto() {
  if (!currentPhotoBase64) return;
  const btn = container.querySelector('#analyzeBtn');
  btn.disabled = true;
  const resultEl = container.querySelector('#analysisResult');
  resultEl.innerHTML = '<p class="loading-text">Analisando a foto…</p>';

  try {
    const parsed = await api.ai.analisarFoto(currentPhotoBase64, currentPhotoMediaType);
    renderAnalysisResult(parsed);
  } catch (e) {
    resultEl.innerHTML = '<p class="error-text">Não consegui analisar essa foto agora. Tente novamente ou registre os valores manualmente.</p>';
  }
  btn.disabled = false;
}

function upsertLocalEntry(entry) {
  const idx = entries.findIndex((e) => e.date === entry.date);
  if (idx >= 0) entries[idx] = entry;
  else entries.push(entry);
  entries.sort((a, b) => a.date.localeCompare(b.date));
}

export async function mount(root) {
  container = root;
  container.innerHTML = diarioTemplate;

  container.querySelector('#todayDate').textContent =
    new Date().toLocaleDateString('pt-BR', { weekday: 'long', day: '2-digit', month: 'long', year: 'numeric' });

  const pesoDateInput = container.querySelector('#fp-date');
  pesoDateInput.value = todayISO();

  [entries, metas] = await Promise.all([api.diario.listEntries(), api.diario.getMetas()]);

  renderAll();
  fillPesoField(pesoDateInput.value);
  fillExtras(todayISO());

  container.querySelector('#m-calorias').value = metas.calorias;
  container.querySelector('#m-proteina').value = metas.proteina;
  container.querySelector('#m-sodio').value = metas.sodio;
  container.querySelector('#m-agua').value = metas.agua;

  initToggle('toggleWhey', 'f-whey');
  initToggle('toggleCreatina', 'f-creatina');

  pesoDateInput.addEventListener('change', () => fillPesoField(pesoDateInput.value));

  container.querySelector('#pesoForm').addEventListener('submit', async (ev) => {
    ev.preventDefault();
    const pesoVal = parseFloatOrNull(container.querySelector('#fp-peso').value);
    if (pesoVal == null) { showToast('Informe um peso válido'); return; }
    const date = pesoDateInput.value;
    const existing = getEntry(date) || {};
    const saved = await api.diario.upsertEntry(date, { ...existing, peso: pesoVal });
    upsertLocalEntry(saved);
    renderAll();
    showToast('Peso salvo');
  });

  container.querySelector('#extrasForm').addEventListener('submit', async (ev) => {
    ev.preventDefault();
    const date = todayISO();
    const existing = getEntry(date) || {};
    const patch = {
      ...existing,
      agua: parseFloatOrNull(container.querySelector('#f-agua').value),
      whey: container.querySelector('#f-whey').checked,
      creatina: container.querySelector('#f-creatina').checked
    };
    const saved = await api.diario.upsertEntry(date, patch);
    upsertLocalEntry(saved);
    renderAll();
    showToast('Salvo');
  });

  container.querySelector('#settingsToggle').addEventListener('click', () => {
    container.querySelector('#settingsPanel').classList.toggle('open');
  });

  container.querySelector('#saveMetas').addEventListener('click', async () => {
    const patch = {
      calorias: Number(container.querySelector('#m-calorias').value) || metas.calorias,
      proteina: Number(container.querySelector('#m-proteina').value) || metas.proteina,
      sodio: Number(container.querySelector('#m-sodio').value) || metas.sodio,
      agua: Number(container.querySelector('#m-agua').value) || metas.agua
    };
    metas = await api.diario.saveMetas(patch);
    renderAll();
    showToast('Metas atualizadas');
  });

  container.querySelector('#photoInput').addEventListener('change', async (ev) => {
    const file = ev.target.files[0];
    if (!file) return;
    try {
      const resized = await fileToResizedBase64(file);
      currentPhotoBase64 = resized.base64;
      currentPhotoMediaType = resized.mediaType;
      container.querySelector('#photoPreviewWrap').innerHTML =
        `<img src="data:${resized.mediaType};base64,${resized.base64}" alt="Prévia da foto da refeição">`;
      container.querySelector('#analyzeBtn').disabled = false;
      container.querySelector('#analysisResult').innerHTML = '';
    } catch (e) {
      container.querySelector('#analysisResult').innerHTML = '<p class="error-text">Não consegui carregar essa imagem. Tente outra foto.</p>';
    }
  });

  container.querySelector('#analyzeBtn').addEventListener('click', analyzePhoto);

  container.querySelectorAll('.tab-btn').forEach((btn) => {
    btn.addEventListener('click', () => {
      container.querySelectorAll('.tab-btn').forEach((b) => b.classList.remove('active'));
      btn.classList.add('active');
      activeNutrientKey = btn.getAttribute('data-key');
      renderNutrientChart();
    });
  });
}

export function getState() {
  return { entries, metas };
}
