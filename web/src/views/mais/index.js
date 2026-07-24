import { showToast } from '../../utils.js';
import { maisTemplate } from './template.js';

const FUTURE_MODULES = [
  'Medidas corporais', 'Fotos de evolução', 'Sono',
  'Humor/Sintomas', 'Hábitos', 'Objetivos', 'Conquistas',
  'Timeline', 'Relatórios', 'Receitas', 'Lista de compras'
];

export async function mount(root) {
  root.innerHTML = maisTemplate;

  const grid = root.querySelector('#modulesGrid');
  grid.innerHTML = FUTURE_MODULES.map((name) => `<button class="module-tile" type="button" data-name="${name}">
    <span class="name">${name}</span>
    <span class="status">Em breve</span>
  </button>`).join('');

  grid.querySelectorAll('.module-tile').forEach((btn) => {
    btn.addEventListener('click', () => showToast(`${btn.getAttribute('data-name')} ainda não foi construído`));
  });
}
