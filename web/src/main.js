import './styles/main.css';

const views = {
  hoje: () => import('./views/hoje/index.js'),
  diario: () => import('./views/diario/index.js'),
  treino: () => import('./views/treino/index.js'),
  exames: () => import('./views/exames/index.js'),
  mais: () => import('./views/mais/index.js')
};

const mounted = new Set();

async function activate(view) {
  document.querySelectorAll('.nav-btn').forEach((b) => b.classList.toggle('active', b.dataset.view === view));
  document.querySelectorAll('.view').forEach((v) => v.classList.toggle('active', v.id === `view-${view}`));

  if (!mounted.has(view)) {
    mounted.add(view);
    const el = document.getElementById(`view-${view}`);
    const mod = await views[view]();
    await mod.mount(el);
  }
}

document.querySelectorAll('.nav-btn').forEach((btn) => {
  btn.addEventListener('click', () => activate(btn.dataset.view));
});

activate('hoje');
