export const medicamentosTemplate = `
<header class="top">
  <div class="eyebrow">Medicamentos</div>
  <h1>Remédios e doses</h1>
  <div class="today-date">Cadastre remédios e registre as doses aplicadas</div>
</header>

<section class="card">
  <h2>Próximas doses</h2>
  <div id="proximasDosesContent">Carregando…</div>
</section>

<section class="card">
  <h2>Cadastrar medicamento</h2>
  <div class="tabs" id="sugestoesTabs">
    <button class="suggestion-chip" type="button" data-sugestao="Mounjaro">Mounjaro</button>
    <button class="suggestion-chip" type="button" data-sugestao="Losartana Potássica">Losartana</button>
    <button class="suggestion-chip" type="button" data-sugestao="Vitamina D3">Vitamina D3</button>
    <button class="suggestion-chip" type="button" data-sugestao="Pantogar Neo">Pantogar Neo</button>
  </div>
  <form class="log-form" id="medForm">
    <div class="field full">
      <label for="med-nome">Nome</label>
      <input type="text" id="med-nome" required>
    </div>
    <div class="field">
      <label for="med-dose">Dose</label>
      <input type="text" id="med-dose" placeholder="ex: 5mg">
    </div>
    <div class="field">
      <label for="med-via">Via</label>
      <select id="med-via">
        <option value="Oral">Oral</option>
        <option value="Subcutânea">Subcutânea</option>
        <option value="Intramuscular">Intramuscular</option>
        <option value="Outra">Outra</option>
      </select>
    </div>
    <div class="field full">
      <label for="med-frequencia">Frequência</label>
      <input type="text" id="med-frequencia" placeholder="ex: 1x/semana, 12/12h">
    </div>
    <div class="field">
      <label for="med-intervalo">Intervalo (dias)</label>
      <input type="number" id="med-intervalo" step="1" min="1" placeholder="opcional">
    </div>
    <div class="field full">
      <label for="med-notas">Notas</label>
      <input type="text" id="med-notas" placeholder="opcional">
    </div>
    <button type="submit" class="primary">Salvar medicamento</button>
  </form>
</section>

<section class="card">
  <h2>Medicamentos cadastrados</h2>
  <div id="medicamentosListContent">Carregando…</div>
</section>

<section class="card">
  <h2>Registrar dose aplicada</h2>
  <form class="log-form" id="doseForm">
    <div class="field full">
      <label for="dose-medicamento">Medicamento</label>
      <select id="dose-medicamento" required></select>
    </div>
    <div class="field">
      <label for="dose-data">Data</label>
      <input type="date" id="dose-data" required>
    </div>
    <div class="field">
      <label for="dose-hora">Hora</label>
      <input type="time" id="dose-hora">
    </div>
    <div class="field full">
      <label for="dose-local">Local (opcional)</label>
      <input type="text" id="dose-local" list="localList" placeholder="ex: Abdômen">
      <datalist id="localList">
        <option value="Abdômen">
        <option value="Coxa">
        <option value="Braço">
      </datalist>
    </div>
    <div class="field full">
      <label>Efeitos colaterais</label>
      <div class="chip-group" id="efeitosChips"></div>
    </div>
    <div class="field full">
      <label for="dose-obs">Observações</label>
      <input type="text" id="dose-obs" placeholder="opcional">
    </div>
    <button type="submit" class="primary">Salvar dose</button>
  </form>
</section>

<section class="card">
  <h2>Histórico de doses</h2>
  <div id="doseHistoricoContent">Carregando…</div>
</section>
`;
