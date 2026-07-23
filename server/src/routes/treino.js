import { Router } from 'express';
import { db } from '../db/client.js';

export const treinoRouter = Router();

function newId(prefix) {
  return `${prefix}-${Date.now()}-${Math.floor(Math.random() * 1000)}`;
}

treinoRouter.get('/forca', (req, res) => {
  res.json(db.prepare('SELECT * FROM treino_forca ORDER BY data ASC').all());
});

treinoRouter.post('/forca', (req, res) => {
  const { data, exercicio, series, repeticoes, carga } = req.body || {};
  if (!data || !exercicio || series == null || repeticoes == null || carga == null) {
    return res.status(400).json({ error: 'data, exercicio, series, repeticoes e carga são obrigatórios' });
  }
  const id = newId('tf');
  db.prepare(`
    INSERT INTO treino_forca (id, data, exercicio, series, repeticoes, carga)
    VALUES (?, ?, ?, ?, ?, ?)
  `).run(id, data, exercicio, series, repeticoes, carga);
  res.status(201).json(db.prepare('SELECT * FROM treino_forca WHERE id = ?').get(id));
});

treinoRouter.delete('/forca/:id', (req, res) => {
  db.prepare('DELETE FROM treino_forca WHERE id = ?').run(req.params.id);
  res.status(204).end();
});

treinoRouter.get('/cardio', (req, res) => {
  res.json(db.prepare('SELECT * FROM treino_cardio ORDER BY data ASC').all());
});

treinoRouter.post('/cardio', (req, res) => {
  const { data, tipo, tempo, distancia, fc, calorias } = req.body || {};
  if (!data || !tipo || tempo == null) {
    return res.status(400).json({ error: 'data, tipo e tempo são obrigatórios' });
  }
  const id = newId('tc');
  db.prepare(`
    INSERT INTO treino_cardio (id, data, tipo, tempo, distancia, fc, calorias)
    VALUES (?, ?, ?, ?, ?, ?, ?)
  `).run(id, data, tipo, tempo, distancia ?? null, fc ?? null, calorias ?? null);
  res.status(201).json(db.prepare('SELECT * FROM treino_cardio WHERE id = ?').get(id));
});

treinoRouter.delete('/cardio/:id', (req, res) => {
  db.prepare('DELETE FROM treino_cardio WHERE id = ?').run(req.params.id);
  res.status(204).end();
});
