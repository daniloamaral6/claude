import { Router } from 'express';
import { db } from '../db/client.js';

export const examesRouter = Router();

function newId(prefix) {
  return `${prefix}-${Date.now()}-${Math.floor(Math.random() * 1000)}`;
}

examesRouter.get('/sangue', (req, res) => {
  res.json(db.prepare('SELECT id, nome, valor, unidade, ref_min AS refMin, ref_max AS refMax, data FROM exames_sangue ORDER BY data ASC').all());
});

examesRouter.post('/sangue', (req, res) => {
  const itens = Array.isArray(req.body) ? req.body : [req.body];
  const insert = db.prepare(`
    INSERT INTO exames_sangue (id, nome, valor, unidade, ref_min, ref_max, data)
    VALUES (?, ?, ?, ?, ?, ?, ?)
  `);
  const ids = [];
  const insertMany = db.transaction((rows) => {
    for (const item of rows) {
      if (!item.nome || item.valor == null || !item.data) continue;
      const id = newId('exs');
      insert.run(id, item.nome, item.valor, item.unidade ?? null, item.refMin ?? null, item.refMax ?? null, item.data);
      ids.push(id);
    }
  });
  insertMany(itens);
  const placeholders = ids.map(() => '?').join(',');
  const saved = ids.length
    ? db.prepare(`SELECT id, nome, valor, unidade, ref_min AS refMin, ref_max AS refMax, data FROM exames_sangue WHERE id IN (${placeholders})`).all(...ids)
    : [];
  res.status(201).json(saved);
});

examesRouter.delete('/sangue/:id', (req, res) => {
  db.prepare('DELETE FROM exames_sangue WHERE id = ?').run(req.params.id);
  res.status(204).end();
});

examesRouter.get('/imagem', (req, res) => {
  res.json(db.prepare('SELECT * FROM exames_imagem ORDER BY data DESC').all());
});

examesRouter.post('/imagem', (req, res) => {
  const itens = Array.isArray(req.body) ? req.body : [req.body];
  const insert = db.prepare(`
    INSERT INTO exames_imagem (id, nome, data, medico, conclusao)
    VALUES (?, ?, ?, ?, ?)
  `);
  const ids = [];
  const insertMany = db.transaction((rows) => {
    for (const item of rows) {
      if (!item.nome || !item.data) continue;
      const id = newId('exi');
      insert.run(id, item.nome, item.data, item.medico ?? null, item.conclusao ?? null);
      ids.push(id);
    }
  });
  insertMany(itens);
  const placeholders = ids.map(() => '?').join(',');
  const saved = ids.length
    ? db.prepare(`SELECT * FROM exames_imagem WHERE id IN (${placeholders})`).all(...ids)
    : [];
  res.status(201).json(saved);
});

examesRouter.delete('/imagem/:id', (req, res) => {
  db.prepare('DELETE FROM exames_imagem WHERE id = ?').run(req.params.id);
  res.status(204).end();
});
