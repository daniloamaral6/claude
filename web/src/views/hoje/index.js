import { api } from '../../api.js';
import { todayISO, fmtNum } from '../../utils.js';
import { hojeTemplate } from './template.js';

const METRICS = [
  { key: 'calorias', label: 'Calorias', unit: 'kcal', metaKey: 'calorias', type: 'max' },
  { key: 'proteina', label: 'Proteína', unit: 'g', metaKey: 'proteina', type: 'min' },
  { key: 'sodio', label: 'Sódio', unit: 'mg', metaKey: 'sodio', type: 'max' },
  { key: 'agua', label: 'Água', unit: 'L', metaKey: 'agua', type: 'min' }
];

export async function mount(root) {
  root.innerHTML = hojeTemplate;

  root.querySelector('#hojeDate').textContent =
    new Date().toLocaleDateString('pt-BR', { weekday: 'long', day: '2-digit', month: 'long', year: 'numeric' });

  const [entries, metas] = await Promise.all([api.diario.listEntries(), api.diario.getMetas()]);

  const pesoEl = root.querySelector('#hojePesoContent');
  const withPeso = entries.filter((e) => e.peso != null);
  if (withPeso.length === 0) {
    pesoEl.innerHTML = '<p class="empty-note">Ainda sem registros de peso. Registre no Diário para começar a acompanhar aqui.</p>';
  } else {
    const last = withPeso[withPeso.length - 1];
    const first = withPeso[0];
    const delta = first.peso - last.peso;
    const deltaClass = delta > 0.05 ? 'down' : (delta < -0.05 ? 'up' : 'flat');
    const deltaTxt = deltaClass === 'flat' ? 'estável' : (delta > 0 ? '−' : '+') + fmtNum(Math.abs(delta)) + ' kg';
    pesoEl.innerHTML = `<div class="hero-num">
      <span class="val">${fmtNum(last.peso)} kg</span>
      <span class="delta ${deltaClass}">${deltaTxt}${withPeso.length > 1 ? ' desde o início' : ''}</span>
    </div>`;
  }

  const metasEl = root.querySelector('#hojeMetasContent');
  const today = entries.find((e) => e.date === todayISO());
  if (!today) {
    metasEl.innerHTML = '<p class="empty-note">Nenhum registro hoje ainda. Vá ao Diário para registrar refeições, água ou suplementos.</p>';
  } else {
    metasEl.innerHTML = METRICS.map((m) => {
      const val = today[m.key] != null ? Number(today[m.key]) : 0;
      const meta = Number(metas[m.metaKey]) || 1;
      const pct = Math.max(0, Math.min(1, val / meta));
      const over = val > meta;
      const barClass = (m.type === 'max' && over) ? 'bar-fill over' : 'bar-fill';
      return `<div class="metric-row">
        <div class="metric-top">
          <span class="metric-name">${m.label}</span>
          <span class="metric-vals">${fmtNum(val)} / ${fmtNum(meta)} ${m.unit}</span>
        </div>
        <div class="bar-track"><div class="${barClass}" style="width:${(pct * 100).toFixed(0)}%;"></div></div>
      </div>`;
    }).join('');
  }
}
