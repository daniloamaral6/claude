import { api } from '../../api.js';
import { todayISO, fmtDatePt, fmtNum, escapeHtml, showToast, parseFloatOrNull, fileToBase64 } from '../../utils.js';
import { buildLineChartSVG } from '../../components/chart.js';
import { examesTemplate } from './template.js';

let examesSangue = [];
let examesImagem = [];
let currentExamBase64 = null;
let container;

function groupExamsByName(list) {
  const groups = {};
  list.forEach((e) => {
    if (!groups[e.nome]) groups[e.nome] = [];
    groups[e.nome].push(e);
  });
  Object.keys(groups).forEach((k) => groups[k].sort((a, b) => (a.data || '').localeCompare(b.data || '')));
  return groups;
}

function wireDelete(el) {
  el.querySelectorAll('.del-btn').forEach((btn) => {
    btn.addEventListener('click', async () => {
      const id = btn.getAttribute('data-id');
      const list = btn.getAttribute('data-list');
      if (list === 'sangue') {
        await api.exames.deleteSangue(id);
        examesSangue = examesSangue.filter((e) => e.id !== id);
        renderBloodExams();
      } else {
        await api.exames.deleteImagem(id);
        examesImagem = examesImagem.filter((e) => e.id !== id);
        renderImagingExams();
      }
      showToast('Registro removido');
    });
  });
}

function renderBloodExams() {
  const el = container.querySelector('#bloodExamsContent');
  if (examesSangue.length === 0) {
    el.innerHTML = '<p class="empty-note">Nenhum exame de sangue registrado ainda. Envie o PDF do laudo acima para preencher automaticamente.</p>';
    return;
  }

  const groups = groupExamsByName(examesSangue);
  const names = Object.keys(groups).sort((a, b) => a.localeCompare(b, 'pt-BR'));

  el.innerHTML = names.map((nome) => {
    const arr = groups[nome];
    const last = arr[arr.length - 1];
    const prev = arr.length > 1 ? arr[arr.length - 2] : null;

    let deltaHtml = '';
    if (prev) {
      const d = last.valor - prev.valor;
      const sign = d > 0.001 ? '+' : (d < -0.001 ? '−' : '');
      deltaHtml = `<span class="exam-delta">${sign}${fmtNum(Math.abs(d))} desde ${fmtDatePt(prev.data)}</span>`;
    }

    let statusHtml = '';
    if (last.refMin != null || last.refMax != null) {
      const out = (last.refMin != null && last.valor < last.refMin) || (last.refMax != null && last.valor > last.refMax);
      statusHtml = `<span class="exam-status ${out ? 'out' : 'in'}">${out ? 'fora da faixa' : 'dentro da faixa'}</span>`;
    }

    let refHtml = '';
    if (last.refMin != null || last.refMax != null) {
      refHtml = `<div class="exam-ref">referência: ${last.refMin != null ? fmtNum(last.refMin) : '—'} a ${last.refMax != null ? fmtNum(last.refMax) : '—'}${last.unidade ? ' ' + escapeHtml(last.unidade) : ''}</div>`;
    }

    const chart = arr.length >= 2 ? buildLineChartSVG(arr, 'valor', { height: 130, showDates: false }) : '';

    const rows = arr.slice().reverse().map((e) => `<div class="exam-row">
      <span class="exam-row-date">${fmtDatePt(e.data)}</span>
      <span class="exam-row-val">${fmtNum(e.valor)}${e.unidade ? ' ' + escapeHtml(e.unidade) : ''}</span>
      <button class="del-btn" data-list="sangue" data-id="${e.id}" aria-label="Excluir exame">×</button>
    </div>`).join('');

    return `<div class="exam-group">
      <div class="exam-group-top">
        <span class="exam-name">${escapeHtml(nome)}</span>${statusHtml}
      </div>
      <div class="exam-last-val">${fmtNum(last.valor)}${last.unidade ? ` <span class="exam-unit">${escapeHtml(last.unidade)}</span>` : ''}${deltaHtml}</div>
      ${refHtml}
      ${chart}
      <div class="exam-rows">${rows}</div>
    </div>`;
  }).join('');

  wireDelete(el);
}

function renderImagingExams() {
  const el = container.querySelector('#imagingExamsContent');
  if (examesImagem.length === 0) {
    el.innerHTML = '<p class="empty-note">Nenhum exame de imagem registrado ainda. Envie o PDF de uma ultrassonografia, ecocardiograma, endoscopia, doppler, MAPA etc.</p>';
    return;
  }
  const sorted = examesImagem.slice().sort((a, b) => (b.data || '').localeCompare(a.data || ''));
  el.innerHTML = sorted.map((e) => `<div class="exam-group">
    <div class="exam-group-top">
      <span class="exam-name">${escapeHtml(e.nome)}</span>
      <button class="del-btn" data-list="imagem" data-id="${e.id}" aria-label="Excluir exame">×</button>
    </div>
    <div class="imaging-meta">${fmtDatePt(e.data)}${e.medico ? ' · ' + escapeHtml(e.medico) : ''}</div>
    <p class="imaging-conclusao">${escapeHtml(e.conclusao)}</p>
  </div>`).join('');

  wireDelete(el);
}

function resetExamUploadUI() {
  currentExamBase64 = null;
  container.querySelector('#examPdfInput').value = '';
  container.querySelector('#examFilePreview').innerHTML = '';
  container.querySelector('#examAnalysisResult').innerHTML = '';
  container.querySelector('#analyzeExamBtn').disabled = true;
}

function renderExamAnalysisResult(itens) {
  const resultEl = container.querySelector('#examAnalysisResult');
  if (!itens || itens.length === 0) {
    resultEl.innerHTML = '<p class="error-text">Não consegui identificar exames nesse PDF. Tente outro arquivo.</p>';
    return;
  }

  const html = itens.map((item, idx) => {
    const tipo = (item.tipo || '').toLowerCase().includes('imagem') ? 'imagem' : 'sangue';
    const dataVal = item.data || todayISO();
    if (tipo === 'sangue') {
      return `<div class="analysis-card" data-idx="${idx}" data-tipo="sangue">
        <label class="exam-item-check"><input type="checkbox" class="item-include" checked> <strong>${escapeHtml(item.nome || 'Exame')}</strong></label>
        <div class="log-form" style="margin-top:8px;">
          <div class="field full"><label>Nome</label><input type="text" class="i-nome" value="${escapeHtml(item.nome || '')}"></div>
          <div class="field"><label>Valor</label><input type="number" step="0.01" class="i-valor" value="${item.valor != null ? item.valor : ''}"></div>
          <div class="field"><label>Unidade</label><input type="text" class="i-unidade" value="${escapeHtml(item.unidade || '')}"></div>
          <div class="field"><label>Ref. mín.</label><input type="number" step="0.01" class="i-refmin" value="${item.refMin != null ? item.refMin : ''}"></div>
          <div class="field"><label>Ref. máx.</label><input type="number" step="0.01" class="i-refmax" value="${item.refMax != null ? item.refMax : ''}"></div>
          <div class="field full"><label>Data</label><input type="date" class="i-data" value="${dataVal}"></div>
        </div>
      </div>`;
    }
    return `<div class="analysis-card" data-idx="${idx}" data-tipo="imagem">
      <label class="exam-item-check"><input type="checkbox" class="item-include" checked> <strong>${escapeHtml(item.nome || 'Exame de imagem')}</strong></label>
      <div class="log-form" style="margin-top:8px;">
        <div class="field full"><label>Nome do exame</label><input type="text" class="i-nome" value="${escapeHtml(item.nome || '')}"></div>
        <div class="field full"><label>Data</label><input type="date" class="i-data" value="${dataVal}"></div>
        <div class="field full"><label>Médico (opcional)</label><input type="text" class="i-medico" value="${escapeHtml(item.medico || '')}"></div>
        <div class="field full"><label>Conclusão</label><textarea class="i-conclusao" rows="3">${escapeHtml(item.conclusao || '')}</textarea></div>
      </div>
    </div>`;
  }).join('') + `<div class="btn-row">
    <button class="btn-secondary" id="discardExamAnalysis" type="button">Descartar</button>
    <button class="btn-primary-inline" id="saveExamItems" type="button">Salvar selecionados</button>
  </div>`;

  resultEl.innerHTML = html;

  resultEl.querySelector('#discardExamAnalysis').addEventListener('click', resetExamUploadUI);

  resultEl.querySelector('#saveExamItems').addEventListener('click', async () => {
    const cards = resultEl.querySelectorAll('.analysis-card');
    const sangueItems = [];
    const imagemItems = [];

    cards.forEach((card) => {
      if (!card.querySelector('.item-include').checked) return;
      const tipo = card.getAttribute('data-tipo');
      if (tipo === 'sangue') {
        const valor = parseFloatOrNull(card.querySelector('.i-valor').value);
        const nome = card.querySelector('.i-nome').value.trim();
        if (!nome || valor == null) return;
        sangueItems.push({
          nome, valor,
          unidade: card.querySelector('.i-unidade').value.trim(),
          refMin: parseFloatOrNull(card.querySelector('.i-refmin').value),
          refMax: parseFloatOrNull(card.querySelector('.i-refmax').value),
          data: card.querySelector('.i-data').value || todayISO()
        });
      } else {
        const nomeImg = card.querySelector('.i-nome').value.trim();
        if (!nomeImg) return;
        imagemItems.push({
          nome: nomeImg,
          data: card.querySelector('.i-data').value || todayISO(),
          medico: card.querySelector('.i-medico').value.trim(),
          conclusao: card.querySelector('.i-conclusao').value.trim()
        });
      }
    });

    const savedCount = sangueItems.length + imagemItems.length;
    if (savedCount === 0) { showToast('Nenhum item selecionado'); return; }

    if (sangueItems.length) examesSangue.push(...await api.exames.addSangue(sangueItems));
    if (imagemItems.length) examesImagem.push(...await api.exames.addImagem(imagemItems));

    renderBloodExams();
    renderImagingExams();
    resetExamUploadUI();
    showToast(savedCount === 1 ? '1 exame salvo' : `${savedCount} exames salvos`);
  });
}

async function analyzeExamFile() {
  if (!currentExamBase64) return;
  const btn = container.querySelector('#analyzeExamBtn');
  btn.disabled = true;
  const resultEl = container.querySelector('#examAnalysisResult');
  resultEl.innerHTML = '<p class="loading-text">Analisando o PDF…</p>';

  try {
    const parsed = await api.ai.analisarExame(currentExamBase64);
    renderExamAnalysisResult(parsed.itens);
  } catch (e) {
    resultEl.innerHTML = '<p class="error-text">Não consegui analisar esse PDF agora. Tente novamente ou envie outro arquivo.</p>';
  }
  btn.disabled = false;
}

export async function mount(root) {
  container = root;
  container.innerHTML = examesTemplate;

  [examesSangue, examesImagem] = await Promise.all([api.exames.listSangue(), api.exames.listImagem()]);

  renderBloodExams();
  renderImagingExams();

  container.querySelector('#examPdfInput').addEventListener('change', async (ev) => {
    const file = ev.target.files[0];
    if (!file) return;
    try {
      currentExamBase64 = await fileToBase64(file);
      container.querySelector('#examFilePreview').innerHTML = `<p class="exam-file-name">${escapeHtml(file.name)}</p>`;
      container.querySelector('#analyzeExamBtn').disabled = false;
      container.querySelector('#examAnalysisResult').innerHTML = '';
    } catch (e) {
      container.querySelector('#examAnalysisResult').innerHTML = '<p class="error-text">Não consegui carregar esse arquivo. Tente outro PDF.</p>';
    }
  });

  container.querySelector('#analyzeExamBtn').addEventListener('click', analyzeExamFile);
}
