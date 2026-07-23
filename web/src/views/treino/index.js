import { api } from '../../api.js';
import { todayISO, fmtDatePt, fmtNum, escapeHtml, showToast, parseFloatOrNull, uniqueSorted } from '../../utils.js';
import { buildLineChartSVG } from '../../components/chart.js';
import { treinoTemplate } from './template.js';

let treinoForca = [];
let treinoCardio = [];
let container;

function renderForcaExerciseOptions() {
  const sel = container.querySelector('#forcaFiltroExercicio');
  const current = sel.value;
  const names = uniqueSorted(treinoForca, 'exercicio');
  if (names.length === 0) {
    sel.innerHTML = '<option value="">—</option>';
    return;
  }
  sel.innerHTML = names.map((n) => `<option value="${escapeHtml(n)}">${escapeHtml(n)}</option>`).join('');
  sel.value = names.includes(current) ? current : names[names.length - 1];
}

function wireDelete(el) {
  el.querySelectorAll('.del-btn').forEach((btn) => {
    btn.addEventListener('click', async () => {
      const id = btn.getAttribute('data-id');
      const list = btn.getAttribute('data-list');
      if (list === 'forca') {
        await api.treino.deleteForca(id);
        treinoForca = treinoForca.filter((e) => e.id !== id);
        renderForcaExerciseOptions();
        renderForcaChart();
      } else {
        await api.treino.deleteCardio(id);
        treinoCardio = treinoCardio.filter((e) => e.id !== id);
        renderCardioTipoOptions();
        renderCardioChart();
      }
      renderTreinoHistorico();
      showToast('Registro removido');
    });
  });
}

function renderForcaChart() {
  const sel = container.querySelector('#forcaFiltroExercicio');
  const wrap = container.querySelector('#forcaChartWrap');
  const exercicio = sel.value;
  if (!exercicio) {
    wrap.innerHTML = '<p class="chart-empty">Ainda sem treinos de força registrados. Assim que você salvar o primeiro, o gráfico aparece aqui.</p>';
    return;
  }
  const arr = treinoForca.filter((e) => e.exercicio === exercicio).sort((a, b) => a.data.localeCompare(b.data));

  const last = arr[arr.length - 1];
  const prev = arr.length > 1 ? arr[arr.length - 2] : null;
  let deltaHtml = '';
  if (prev) {
    const d = last.carga - prev.carga;
    const sign = d > 0.001 ? '+' : (d < -0.001 ? '−' : '');
    deltaHtml = `<span class="exam-delta">${sign}${fmtNum(Math.abs(d))}kg desde ${fmtDatePt(prev.data)}</span>`;
  }

  const chart = arr.length >= 2 ? buildLineChartSVG(arr, 'carga', { height: 150 }) : '<p class="chart-axis-label">Registre mais uma sessão para ver a linha de evolução.</p>';

  const rows = arr.slice().reverse().map((e) => `<div class="exam-row">
    <span class="exam-row-date">${fmtDatePt(e.data)}</span>
    <span class="exam-row-val">${e.series}x${e.repeticoes} @ ${fmtNum(e.carga)}kg</span>
    <button class="del-btn" data-list="forca" data-id="${e.id}" aria-label="Excluir">×</button>
  </div>`).join('');

  wrap.innerHTML = `<div class="exam-last-val">${fmtNum(last.carga)} <span class="exam-unit">kg</span>${deltaHtml}</div>${chart}<div class="exam-rows">${rows}</div>`;
  wireDelete(wrap);
}

function renderCardioTipoOptions() {
  const sel = container.querySelector('#cardioFiltroTipo');
  const current = sel.value;
  const tipos = uniqueSorted(treinoCardio, 'tipo');
  const opts = ['Todos', ...tipos];
  sel.innerHTML = opts.map((t) => `<option value="${escapeHtml(t)}">${escapeHtml(t)}</option>`).join('');
  sel.value = opts.includes(current) ? current : 'Todos';
}

function renderCardioChart() {
  const sel = container.querySelector('#cardioFiltroTipo');
  const wrap = container.querySelector('#cardioChartWrap');
  const tipo = sel.value;

  if (treinoCardio.length === 0) {
    wrap.innerHTML = '<p class="chart-empty">Ainda sem sessões de cardio registradas.</p>';
    return;
  }

  const arr = (tipo === 'Todos' ? treinoCardio.slice() : treinoCardio.filter((e) => e.tipo === tipo))
    .sort((a, b) => a.data.localeCompare(b.data));

  if (arr.length === 0) {
    wrap.innerHTML = '<p class="chart-empty">Nenhuma sessão desse tipo ainda.</p>';
    return;
  }

  const last = arr[arr.length - 1];
  const prev = arr.length > 1 ? arr[arr.length - 2] : null;
  let deltaHtml = '';
  if (prev) {
    const d = last.tempo - prev.tempo;
    const sign = d > 0.001 ? '+' : (d < -0.001 ? '−' : '');
    deltaHtml = `<span class="exam-delta">${sign}${fmtNum(Math.abs(d))}min desde ${fmtDatePt(prev.data)}</span>`;
  }

  const chart = arr.length >= 2 ? buildLineChartSVG(arr, 'tempo', { height: 150 }) : '<p class="chart-axis-label">Registre mais uma sessão para ver a linha de evolução.</p>';

  const rows = arr.slice().reverse().map((e) => {
    const extra = [];
    if (e.distancia) extra.push(fmtNum(e.distancia) + 'km');
    if (e.distancia && e.tempo) extra.push(fmtNum(e.tempo / e.distancia) + 'min/km');
    if (e.fc) extra.push(e.fc + 'bpm');
    if (e.calorias) extra.push(fmtNum(e.calorias) + 'kcal');
    return `<div class="exam-row">
      <span class="exam-row-date">${fmtDatePt(e.data)}</span>
      <span class="exam-row-val">${escapeHtml(e.tipo)} · ${fmtNum(e.tempo)}min${extra.length ? ' · ' + extra.join(' · ') : ''}</span>
      <button class="del-btn" data-list="cardio" data-id="${e.id}" aria-label="Excluir">×</button>
    </div>`;
  }).join('');

  wrap.innerHTML = `<div class="exam-last-val">${fmtNum(last.tempo)} <span class="exam-unit">min</span>${deltaHtml}</div>${chart}<div class="exam-rows">${rows}</div>`;
  wireDelete(wrap);
}

function renderTreinoHistorico() {
  const el = container.querySelector('#treinoHistoricoContent');
  const combined = [
    ...treinoForca.map((e) => ({ kind: 'forca', ...e })),
    ...treinoCardio.map((e) => ({ kind: 'cardio', ...e }))
  ];

  if (combined.length === 0) {
    el.innerHTML = '<p class="empty-note">Seus treinos registrados vão aparecer aqui.</p>';
    return;
  }

  combined.sort((a, b) => b.data.localeCompare(a.data));

  el.innerHTML = combined.map((e) => {
    let desc;
    if (e.kind === 'forca') {
      desc = `${escapeHtml(e.exercicio)} — ${e.series}x${e.repeticoes} @ ${fmtNum(e.carga)}kg`;
    } else {
      const extra = [];
      if (e.distancia) extra.push(fmtNum(e.distancia) + 'km');
      desc = `${escapeHtml(e.tipo)} — ${fmtNum(e.tempo)}min${extra.length ? ' · ' + extra.join(' · ') : ''}`;
    }
    return `<div class="hist-row">
      <span class="hist-date">${fmtDatePt(e.data)}</span>
      <span class="hist-vals">${desc}</span>
      <button class="del-btn" data-list="${e.kind}" data-id="${e.id}" aria-label="Excluir">×</button>
    </div>`;
  }).join('');

  wireDelete(el);
}

export async function mount(root) {
  container = root;
  container.innerHTML = treinoTemplate;

  container.querySelector('#tf-data').value = todayISO();
  container.querySelector('#tc-data').value = todayISO();

  [treinoForca, treinoCardio] = await Promise.all([api.treino.listForca(), api.treino.listCardio()]);

  renderForcaExerciseOptions();
  renderForcaChart();
  renderCardioTipoOptions();
  renderCardioChart();
  renderTreinoHistorico();

  container.querySelector('#forcaForm').addEventListener('submit', async (ev) => {
    ev.preventDefault();
    const series = parseFloatOrNull(container.querySelector('#tf-series').value);
    const reps = parseFloatOrNull(container.querySelector('#tf-reps').value);
    const carga = parseFloatOrNull(container.querySelector('#tf-carga').value);
    const exercicio = container.querySelector('#tf-exercicio').value.trim();
    if (!exercicio || series == null || reps == null || carga == null) { showToast('Preencha todos os campos'); return; }
    const saved = await api.treino.addForca({
      data: container.querySelector('#tf-data').value || todayISO(),
      exercicio, series, repeticoes: reps, carga
    });
    treinoForca.push(saved);
    renderForcaExerciseOptions();
    container.querySelector('#forcaFiltroExercicio').value = exercicio;
    renderForcaChart();
    renderTreinoHistorico();
    showToast('Treino de força salvo');
  });

  container.querySelector('#cardioForm').addEventListener('submit', async (ev) => {
    ev.preventDefault();
    const tempo = parseFloatOrNull(container.querySelector('#tc-tempo').value);
    if (tempo == null) { showToast('Informe o tempo'); return; }
    const tipo = container.querySelector('#tc-tipo').value;
    const saved = await api.treino.addCardio({
      data: container.querySelector('#tc-data').value || todayISO(),
      tipo, tempo,
      distancia: parseFloatOrNull(container.querySelector('#tc-distancia').value),
      fc: parseFloatOrNull(container.querySelector('#tc-fc').value),
      calorias: parseFloatOrNull(container.querySelector('#tc-calorias').value)
    });
    treinoCardio.push(saved);
    renderCardioTipoOptions();
    container.querySelector('#cardioFiltroTipo').value = tipo;
    renderCardioChart();
    renderTreinoHistorico();
    showToast('Cardio salvo');
  });

  container.querySelector('#forcaFiltroExercicio').addEventListener('change', renderForcaChart);
  container.querySelector('#cardioFiltroTipo').addEventListener('change', renderCardioChart);
}
