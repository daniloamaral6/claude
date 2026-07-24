import { api } from '../../api.js';
import { todayISO, fmtDatePt, escapeHtml, showToast, parseFloatOrNull, addDaysISO, diffDaysISO } from '../../utils.js';
import { medicamentosTemplate } from './template.js';

const EFEITOS_COLATERAIS = ['Náusea', 'Prisão de ventre', 'Diarreia', 'Refluxo/Azia', 'Dor abdominal', 'Dor de cabeça', 'Cãibras'];

const SUGESTOES = {
  'Mounjaro': { dose: '5mg', via: 'Subcutânea', frequencia: '1x/semana', intervaloDias: 7, notas: '' },
  'Losartana Potássica': { dose: '50mg', via: 'Oral', frequencia: '12/12h (manhã e noite)', intervaloDias: '', notas: '' },
  'Vitamina D3': { dose: '14000 UI', via: 'Oral', frequencia: '1x/semana', intervaloDias: 7, notas: '' },
  'Pantogar Neo': { dose: '2 cápsulas', via: 'Oral', frequencia: 'após o almoço', intervaloDias: 1, notas: '' }
};

let medicamentos = [];
let aplicacoes = [];
let efeitosSelecionados = new Set();
let container;

function getMedicamento(id) {
  return medicamentos.find((m) => m.id === id);
}

function aplicacoesDoMedicamento(medicamentoId) {
  return aplicacoes.filter((a) => a.medicamentoId === medicamentoId).sort((a, b) => (a.data + (a.hora || '')).localeCompare(b.data + (b.hora || '')));
}

function renderProximasDoses() {
  const el = container.querySelector('#proximasDosesContent');
  const comIntervalo = medicamentos.filter((m) => m.intervaloDias != null && m.intervaloDias !== '');

  if (comIntervalo.length === 0) {
    el.innerHTML = '<p class="empty-note">Nenhum medicamento com intervalo definido ainda. Cadastre um com "Intervalo (dias)" preenchido para ver a previsão aqui.</p>';
    return;
  }

  const hoje = todayISO();

  el.innerHTML = comIntervalo.map((m) => {
    const arr = aplicacoesDoMedicamento(m.id);
    if (arr.length === 0) {
      return `<div class="exam-group">
        <div class="exam-group-top"><span class="exam-name">${escapeHtml(m.nome)}</span></div>
        <p class="empty-note">Ainda sem doses registradas. Registre a primeira aplicação para começar a prever a próxima.</p>
      </div>`;
    }
    const ultima = arr[arr.length - 1];
    const proximaData = addDaysISO(ultima.data, m.intervaloDias);
    const diff = diffDaysISO(hoje, proximaData);
    const atrasada = diff < 0;
    const statusTxt = atrasada
      ? `atrasada há ${Math.abs(diff)} dia${Math.abs(diff) === 1 ? '' : 's'}`
      : (diff === 0 ? 'hoje' : `em ${diff} dia${diff === 1 ? '' : 's'}`);

    return `<div class="exam-group">
      <div class="exam-group-top">
        <span class="exam-name">${escapeHtml(m.nome)}</span>
        <span class="exam-status ${atrasada ? 'out' : 'in'}">${statusTxt}</span>
      </div>
      <div class="exam-ref">última dose: ${fmtDatePt(ultima.data)} · próxima prevista: ${fmtDatePt(proximaData)}</div>
    </div>`;
  }).join('');
}

function renderMedicamentosList() {
  const el = container.querySelector('#medicamentosListContent');
  if (medicamentos.length === 0) {
    el.innerHTML = '<p class="empty-note">Nenhum medicamento cadastrado ainda.</p>';
    return;
  }
  el.innerHTML = medicamentos.map((m) => `<div class="hist-row">
    <span class="hist-vals">
      <strong>${escapeHtml(m.nome)}</strong>${m.dose ? ' · ' + escapeHtml(m.dose) : ''} · ${escapeHtml(m.via)}${m.frequencia ? ' · ' + escapeHtml(m.frequencia) : ''}
      ${m.notas ? `<br><span style="color:var(--ink-faint);">${escapeHtml(m.notas)}</span>` : ''}
    </span>
    <button class="del-btn" data-list="medicamento" data-id="${m.id}" aria-label="Excluir medicamento">×</button>
  </div>`).join('');
  wireDelete(el);
}

function renderDoseMedicamentoSelect() {
  const sel = container.querySelector('#dose-medicamento');
  const current = sel.value;
  if (medicamentos.length === 0) {
    sel.innerHTML = '<option value="">Cadastre um medicamento primeiro</option>';
    return;
  }
  sel.innerHTML = medicamentos.map((m) => `<option value="${m.id}">${escapeHtml(m.nome)}</option>`).join('');
  if (medicamentos.some((m) => m.id === current)) sel.value = current;
}

function renderEfeitosChips() {
  const el = container.querySelector('#efeitosChips');
  el.innerHTML = EFEITOS_COLATERAIS.map((nome) => `<button type="button" class="chip" data-efeito="${escapeHtml(nome)}">${escapeHtml(nome)}</button>`).join('');
  el.querySelectorAll('.chip').forEach((chip) => {
    chip.addEventListener('click', () => {
      const nome = chip.getAttribute('data-efeito');
      if (efeitosSelecionados.has(nome)) { efeitosSelecionados.delete(nome); chip.classList.remove('on'); }
      else { efeitosSelecionados.add(nome); chip.classList.add('on'); }
    });
  });
}

function renderDoseHistorico() {
  const el = container.querySelector('#doseHistoricoContent');
  if (aplicacoes.length === 0) {
    el.innerHTML = '<p class="empty-note">Nenhuma dose registrada ainda.</p>';
    return;
  }
  const sorted = aplicacoes.slice().sort((a, b) => (b.data + (b.hora || '')).localeCompare(a.data + (a.hora || '')));
  el.innerHTML = sorted.map((a) => {
    const med = getMedicamento(a.medicamentoId);
    const badges = (a.efeitosColaterais || []).map((ef) => `<span class="badge">${escapeHtml(ef)}</span>`).join('');
    const detalhes = [a.hora, a.local].filter(Boolean).map(escapeHtml).join(' · ');
    return `<div class="hist-row">
      <span class="hist-date">${fmtDatePt(a.data)}</span>
      <span class="hist-vals">
        <strong>${escapeHtml(med ? med.nome : 'Medicamento removido')}</strong>${detalhes ? ' · ' + detalhes : ''}
        ${a.obs ? `<br><span style="color:var(--ink-faint);">${escapeHtml(a.obs)}</span>` : ''}
      </span>
      <span class="hist-badges">${badges}</span>
      <button class="del-btn" data-list="aplicacao" data-id="${a.id}" aria-label="Excluir dose">×</button>
    </div>`;
  }).join('');
  wireDelete(el);
}

function renderAll() {
  renderProximasDoses();
  renderMedicamentosList();
  renderDoseMedicamentoSelect();
  renderDoseHistorico();
}

function wireDelete(el) {
  el.querySelectorAll('.del-btn').forEach((btn) => {
    btn.addEventListener('click', async () => {
      const id = btn.getAttribute('data-id');
      const list = btn.getAttribute('data-list');
      if (list === 'medicamento') {
        await api.medicamentos.remove(id);
        medicamentos = medicamentos.filter((m) => m.id !== id);
        aplicacoes = aplicacoes.filter((a) => a.medicamentoId !== id);
      } else {
        await api.medicamentos.removeAplicacao(id);
        aplicacoes = aplicacoes.filter((a) => a.id !== id);
      }
      renderAll();
      showToast('Removido');
    });
  });
}

function fillSuggestion(nome) {
  const sug = SUGESTOES[nome];
  container.querySelector('#med-nome').value = nome;
  container.querySelector('#med-dose').value = sug.dose;
  container.querySelector('#med-via').value = sug.via;
  container.querySelector('#med-frequencia').value = sug.frequencia;
  container.querySelector('#med-intervalo').value = sug.intervaloDias;
  container.querySelector('#med-notas').value = sug.notas;
}

export async function mount(root) {
  container = root;
  container.innerHTML = medicamentosTemplate;
  efeitosSelecionados = new Set();

  container.querySelector('#dose-data').value = todayISO();
  renderEfeitosChips();

  [medicamentos, aplicacoes] = await Promise.all([api.medicamentos.list(), api.medicamentos.listAplicacoes()]);
  renderAll();

  container.querySelectorAll('.suggestion-chip').forEach((btn) => {
    btn.addEventListener('click', () => fillSuggestion(btn.getAttribute('data-sugestao')));
  });

  container.querySelector('#medForm').addEventListener('submit', async (ev) => {
    ev.preventDefault();
    const nome = container.querySelector('#med-nome').value.trim();
    const via = container.querySelector('#med-via').value;
    if (!nome) { showToast('Informe o nome do medicamento'); return; }
    const saved = await api.medicamentos.add({
      nome,
      dose: container.querySelector('#med-dose').value.trim(),
      via,
      frequencia: container.querySelector('#med-frequencia').value.trim(),
      intervaloDias: parseFloatOrNull(container.querySelector('#med-intervalo').value),
      notas: container.querySelector('#med-notas').value.trim()
    });
    medicamentos.push(saved);
    container.querySelector('#medForm').reset();
    renderAll();
    showToast('Medicamento salvo');
  });

  container.querySelector('#doseForm').addEventListener('submit', async (ev) => {
    ev.preventDefault();
    const medicamentoId = container.querySelector('#dose-medicamento').value;
    const data = container.querySelector('#dose-data').value;
    if (!medicamentoId || !data) { showToast('Selecione o medicamento e a data'); return; }
    const saved = await api.medicamentos.addAplicacao({
      medicamentoId,
      data,
      hora: container.querySelector('#dose-hora').value || null,
      local: container.querySelector('#dose-local').value.trim() || null,
      efeitosColaterais: Array.from(efeitosSelecionados),
      obs: container.querySelector('#dose-obs').value.trim() || null
    });
    aplicacoes.push(saved);
    container.querySelector('#doseForm').reset();
    container.querySelector('#dose-data').value = todayISO();
    efeitosSelecionados = new Set();
    renderEfeitosChips();
    renderAll();
    showToast('Dose registrada');
  });
}
