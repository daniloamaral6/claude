import { Router } from 'express';
import { db } from '../db/client.js';

export const medicamentosRouter = Router();

function newId(prefix) {
  return `${prefix}-${Date.now()}-${Math.floor(Math.random() * 1000)}`;
}

function rowToMedicamento(row) {
  return {
    id: row.id,
    nome: row.nome,
    dose: row.dose,
    via: row.via,
    frequencia: row.frequencia,
    intervaloDias: row.intervalo_dias,
    notas: row.notas
  };
}

function rowToAplicacao(row) {
  return {
    id: row.id,
    medicamentoId: row.medicamento_id,
    data: row.data,
    hora: row.hora,
    local: row.local,
    efeitosColaterais: row.efeitos_colaterais ? JSON.parse(row.efeitos_colaterais) : [],
    obs: row.obs
  };
}

medicamentosRouter.get('/', (req, res) => {
  const rows = db.prepare('SELECT * FROM medicamentos ORDER BY nome COLLATE NOCASE ASC').all();
  res.json(rows.map(rowToMedicamento));
});

medicamentosRouter.post('/', (req, res) => {
  const { nome, dose, via, frequencia, intervaloDias, notas } = req.body || {};
  if (!nome || !via) {
    return res.status(400).json({ error: 'nome e via são obrigatórios' });
  }
  const id = newId('med');
  db.prepare(`
    INSERT INTO medicamentos (id, nome, dose, via, frequencia, intervalo_dias, notas)
    VALUES (?, ?, ?, ?, ?, ?, ?)
  `).run(id, nome, dose ?? null, via, frequencia ?? null, intervaloDias ?? null, notas ?? null);
  res.status(201).json(rowToMedicamento(db.prepare('SELECT * FROM medicamentos WHERE id = ?').get(id)));
});

medicamentosRouter.delete('/:id', (req, res) => {
  db.prepare('DELETE FROM medicamentos WHERE id = ?').run(req.params.id);
  res.status(204).end();
});

medicamentosRouter.get('/aplicacoes', (req, res) => {
  const rows = db.prepare('SELECT * FROM aplicacoes_medicamento ORDER BY data ASC, hora ASC').all();
  res.json(rows.map(rowToAplicacao));
});

medicamentosRouter.post('/aplicacoes', (req, res) => {
  const { medicamentoId, data, hora, local, efeitosColaterais, obs } = req.body || {};
  if (!medicamentoId || !data) {
    return res.status(400).json({ error: 'medicamentoId e data são obrigatórios' });
  }
  const id = newId('apm');
  db.prepare(`
    INSERT INTO aplicacoes_medicamento (id, medicamento_id, data, hora, local, efeitos_colaterais, obs)
    VALUES (?, ?, ?, ?, ?, ?, ?)
  `).run(id, medicamentoId, data, hora ?? null, local ?? null, JSON.stringify(efeitosColaterais || []), obs ?? null);
  res.status(201).json(rowToAplicacao(db.prepare('SELECT * FROM aplicacoes_medicamento WHERE id = ?').get(id)));
});

medicamentosRouter.delete('/aplicacoes/:id', (req, res) => {
  db.prepare('DELETE FROM aplicacoes_medicamento WHERE id = ?').run(req.params.id);
  res.status(204).end();
});
