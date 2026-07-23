export const treinoTemplate = `
<header class="top">
  <div class="eyebrow">Treino · Musculação e cardio</div>
  <h1>Evolução dos treinos</h1>
  <div class="today-date">Registre carga, séries e sessões de cardio</div>
</header>

<section class="card">
  <h2>Registrar treino de força</h2>
  <form class="log-form" id="forcaForm">
    <div class="field full">
      <label for="tf-data">Data</label>
      <input type="date" id="tf-data" required>
    </div>
    <div class="field full">
      <label for="tf-exercicio">Exercício</label>
      <input type="text" id="tf-exercicio" list="exerciciosList" required placeholder="ex: Leg Press">
      <datalist id="exerciciosList">
        <option value="Leg Press">
        <option value="Supino máquina">
        <option value="Puxador frente">
        <option value="Desenvolvimento de ombro (máquina)">
        <option value="Cadeira extensora">
        <option value="Mesa flexora">
        <option value="Remada baixa (cabo)">
        <option value="Peck deck">
        <option value="Elevação lateral">
        <option value="Panturrilha (máquina)">
        <option value="Abdominal (máquina)">
      </datalist>
    </div>
    <div class="field">
      <label for="tf-series">Séries</label>
      <input type="number" id="tf-series" step="1" min="1" required>
    </div>
    <div class="field">
      <label for="tf-reps">Repetições</label>
      <input type="number" id="tf-reps" step="1" min="1" required>
    </div>
    <div class="field full">
      <label for="tf-carga">Carga (kg)</label>
      <input type="number" id="tf-carga" step="0.5" min="0" required>
    </div>
    <button type="submit" class="primary">Salvar treino de força</button>
  </form>
</section>

<section class="card">
  <h2>Registrar cardio</h2>
  <form class="log-form" id="cardioForm">
    <div class="field full">
      <label for="tc-data">Data</label>
      <input type="date" id="tc-data" required>
    </div>
    <div class="field full">
      <label for="tc-tipo">Tipo</label>
      <select id="tc-tipo">
        <option value="Caminhada">Caminhada</option>
        <option value="Corrida">Corrida</option>
        <option value="Bike">Bike</option>
        <option value="Esteira">Esteira</option>
        <option value="Escada">Escada</option>
        <option value="Natação">Natação</option>
      </select>
    </div>
    <div class="field">
      <label for="tc-tempo">Tempo (min)</label>
      <input type="number" id="tc-tempo" step="1" min="0" required>
    </div>
    <div class="field">
      <label for="tc-distancia">Distância (km)</label>
      <input type="number" id="tc-distancia" step="0.01" min="0" placeholder="opcional">
    </div>
    <div class="field">
      <label for="tc-fc">FC média (bpm)</label>
      <input type="number" id="tc-fc" step="1" min="0" placeholder="opcional">
    </div>
    <div class="field">
      <label for="tc-calorias">Calorias</label>
      <input type="number" id="tc-calorias" step="1" min="0" placeholder="opcional">
    </div>
    <button type="submit" class="primary">Salvar cardio</button>
  </form>
</section>

<section class="card">
  <h2>Evolução de carga</h2>
  <div class="field full" style="margin-bottom:12px;">
    <label for="forcaFiltroExercicio">Exercício</label>
    <select id="forcaFiltroExercicio"></select>
  </div>
  <div id="forcaChartWrap">Carregando…</div>
</section>

<section class="card">
  <h2>Evolução — cardio</h2>
  <div class="field full" style="margin-bottom:12px;">
    <label for="cardioFiltroTipo">Tipo</label>
    <select id="cardioFiltroTipo"></select>
  </div>
  <div id="cardioChartWrap">Carregando…</div>
</section>

<section class="card">
  <h2>Histórico de treinos</h2>
  <div id="treinoHistoricoContent">Carregando…</div>
</section>
`;
