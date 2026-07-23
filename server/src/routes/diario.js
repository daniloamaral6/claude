import { Router } from 'express';
import { db } from '../db/client.js';

export const diarioRouter = Router();

function rowToEntry(row) {
  if (!row) return null;
  return {
    date: row.date,
    peso: row.peso,
    calorias: row.calorias,
    proteina: row.proteina,
    sodio: row.sodio,
    agua: row.agua,
    whey: !!row.whey,
    creatina: !!row.creatina
  };
}

diarioRouter.get('/entries', (req, res) => {
  const rows = db.prepare('SELECT * FROM entries ORDER BY date ASC').all();
  res.json(rows.map(rowToEntry));
});

diarioRouter.put('/entries/:date', (req, res) => {
  const { date } = req.params;
  const patch = req.body || {};
  const existing = db.prepare('SELECT * FROM entries WHERE date = ?').get(date);
  const base = rowToEntry(existing) || {
    date, peso: null, calorias: null, proteina: null, sodio: null, agua: null, whey: false, creatina: false
  };
  const merged = { ...base, ...patch, date };

  db.prepare(`
    INSERT INTO entries (date, peso, calorias, proteina, sodio, agua, whey, creatina)
    VALUES (@date, @peso, @calorias, @proteina, @sodio, @agua, @whey, @creatina)
    ON CONFLICT(date) DO UPDATE SET
      peso=excluded.peso, calorias=excluded.calorias, proteina=excluded.proteina,
      sodio=excluded.sodio, agua=excluded.agua, whey=excluded.whey, creatina=excluded.creatina
  `).run({
    ...merged,
    whey: merged.whey ? 1 : 0,
    creatina: merged.creatina ? 1 : 0
  });

  res.json(rowToEntry(db.prepare('SELECT * FROM entries WHERE date = ?').get(date)));
});

diarioRouter.delete('/entries/:date', (req, res) => {
  db.prepare('DELETE FROM entries WHERE date = ?').run(req.params.date);
  res.status(204).end();
});

diarioRouter.get('/metas', (req, res) => {
  const row = db.prepare('SELECT calorias, proteina, sodio, agua FROM metas WHERE id = 1').get();
  res.json(row);
});

diarioRouter.put('/metas', (req, res) => {
  const { calorias, proteina, sodio, agua } = req.body || {};
  db.prepare(`
    UPDATE metas SET calorias = ?, proteina = ?, sodio = ?, agua = ? WHERE id = 1
  `).run(calorias, proteina, sodio, agua);
  res.json(db.prepare('SELECT calorias, proteina, sodio, agua FROM metas WHERE id = 1').get());
});
