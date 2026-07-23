import 'dotenv/config';
import express from 'express';
import path from 'node:path';
import fs from 'node:fs';
import { fileURLToPath } from 'node:url';
import { db } from './db/client.js';
import { diarioRouter } from './routes/diario.js';
import { treinoRouter } from './routes/treino.js';
import { examesRouter } from './routes/exames.js';
import { aiRouter } from './routes/ai.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

// garante que o schema existe antes de aceitar requisições
db.exec(fs.readFileSync(path.join(__dirname, 'db/schema.sql'), 'utf8'));

const app = express();
app.use(express.json({ limit: '15mb' }));

app.use('/api/diario', diarioRouter);
app.use('/api/treino', treinoRouter);
app.use('/api/exames', examesRouter);
app.use('/api/ai', aiRouter);

const webDist = path.join(__dirname, '../../web/dist');
if (fs.existsSync(webDist)) {
  app.use(express.static(webDist));
  app.get('*', (req, res) => {
    res.sendFile(path.join(webDist, 'index.html'));
  });
}

const PORT = process.env.PORT || 3001;
app.listen(PORT, () => {
  console.log(`API rodando em http://localhost:${PORT}`);
});
