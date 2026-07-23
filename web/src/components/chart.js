import { fmtDatePt, fmtNum } from '../utils.js';

/**
 * Gráfico de linha genérico (peso, exames, carga, cardio).
 * points: array ordenado por data, cada item precisa de `data` (ISO) e `[valueKey]` (número).
 */
export function buildLineChartSVG(points, valueKey, { showMinMax = false, showDates = true, height = 200 } = {}) {
  const W = 600, H = height, padL = 6, padR = 6, padT = showMinMax ? 18 : 14, padB = 24;
  const vals = points.map((p) => Number(p[valueKey]));
  let min = Math.min(...vals);
  let max = Math.max(...vals);
  if (min === max) { min -= (min * 0.1 || 1); max += (max * 0.1 || 1); }
  const range = max - min;

  const x = (i) => padL + (i / (points.length - 1)) * (W - padL - padR);
  const y = (v) => padT + (1 - (v - min) / range) * (H - padT - padB);

  const path = points.map((p, i) => `${i === 0 ? 'M' : 'L'} ${x(i).toFixed(1)} ${y(Number(p[valueKey])).toFixed(1)}`).join(' ');

  const dots = points.map((p, i) => {
    const isLast = i === points.length - 1;
    return `<circle class="${isLast ? 'chart-dot-last' : 'chart-dot'}" cx="${x(i).toFixed(1)}" cy="${y(Number(p[valueKey])).toFixed(1)}" r="${isLast ? 4.5 : 2.5}"></circle>`;
  }).join('');

  let minMaxLabels = '';
  if (showMinMax) {
    const gridY1 = padT, gridY2 = H - padB;
    minMaxLabels =
      `<line class="chart-grid" x1="${padL}" y1="${gridY1}" x2="${W - padR}" y2="${gridY1}"></line>` +
      `<line class="chart-grid" x1="${padL}" y1="${gridY2}" x2="${W - padR}" y2="${gridY2}"></line>` +
      `<text class="chart-axis-label" x="${padL}" y="${gridY1 - 5}">${fmtNum(max)} kg</text>` +
      `<text class="chart-axis-label" x="${padL}" y="${gridY2 + 14}">${fmtNum(min)} kg</text>`;
  }

  const dateLabels = showDates
    ? `<text class="chart-axis-label" x="${padL}" y="${H - 4}">${fmtDatePt(points[0].data ?? points[0].date)}</text>` +
      `<text class="chart-axis-label" x="${W - padR}" y="${H - 4}" text-anchor="end">${fmtDatePt(points[points.length - 1].data ?? points[points.length - 1].date)}</text>`
    : '';

  return `<svg class="chart" viewBox="0 0 ${W} ${H}" preserveAspectRatio="none">` +
    minMaxLabels +
    `<path class="chart-line" d="${path}"></path>` +
    dots +
    dateLabels +
    `</svg>`;
}

/**
 * Gráfico de barras com linha de meta tracejada (nutrientes do diário).
 */
export function buildBarChartSVG(entries, cfg, target) {
  const W = 600, H = 200, padL = 6, padR = 6, padT = 22, padB = 24;
  let data = entries.filter((e) => e[cfg.key] != null);
  if (data.length === 0) return null;

  const maxShow = 30;
  if (data.length > maxShow) data = data.slice(data.length - maxShow);

  const maxEntryVal = Math.max(...data.map((e) => Number(e[cfg.key])));
  const maxVal = Math.max(target, maxEntryVal) * 1.15;
  const n = data.length;
  const slot = (W - padL - padR) / n;
  const barW = Math.max(3, slot - 4);

  const xSlot = (i) => padL + i * slot;
  const y = (v) => padT + (1 - v / maxVal) * (H - padT - padB);

  const bars = data.map((e, i) => {
    const v = Number(e[cfg.key]);
    const over = cfg.type === 'max' ? v > target : v < target;
    const barX = xSlot(i) + (slot - barW) / 2;
    const barY = y(v);
    const barH = (H - padB) - barY;
    return `<rect class="metric-bar${over ? ' over' : ''}" x="${barX.toFixed(1)}" y="${barY.toFixed(1)}" width="${barW.toFixed(1)}" height="${Math.max(0, barH).toFixed(1)}" rx="2"></rect>`;
  }).join('');

  const targetY = y(target);

  return `<svg class="chart" viewBox="0 0 ${W} ${H}" preserveAspectRatio="none">` +
    `<line class="chart-grid" x1="${padL}" y1="${H - padB}" x2="${W - padR}" y2="${H - padB}"></line>` +
    `<line class="target-line" x1="${padL}" y1="${targetY.toFixed(1)}" x2="${W - padR}" y2="${targetY.toFixed(1)}"></line>` +
    `<text class="chart-axis-label" x="${W - padR}" y="${(targetY - 5).toFixed(1)}" text-anchor="end">meta ${fmtNum(target)} ${cfg.unit}</text>` +
    bars +
    `<text class="chart-axis-label" x="${padL}" y="${H - 4}">${fmtDatePt(data[0].date)}</text>` +
    `<text class="chart-axis-label" x="${W - padR}" y="${H - 4}" text-anchor="end">${fmtDatePt(data[n - 1].date)}</text>` +
    `</svg>`;
}
