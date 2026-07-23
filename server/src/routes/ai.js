import { Router } from 'express';
import { analyzeMealPhoto, analyzeExamPdf } from '../services/anthropic.js';

export const aiRouter = Router();

aiRouter.post('/analisar-foto', async (req, res) => {
  const { base64, mediaType } = req.body || {};
  if (!base64 || !mediaType) {
    return res.status(400).json({ error: 'base64 e mediaType são obrigatórios' });
  }
  try {
    const parsed = await analyzeMealPhoto(base64, mediaType);
    res.json(parsed);
  } catch (err) {
    console.error('analisar-foto falhou:', err);
    res.status(502).json({ error: 'Não foi possível analisar a foto agora.' });
  }
});

aiRouter.post('/analisar-exame', async (req, res) => {
  const { base64 } = req.body || {};
  if (!base64) {
    return res.status(400).json({ error: 'base64 é obrigatório' });
  }
  try {
    const parsed = await analyzeExamPdf(base64);
    res.json(parsed);
  } catch (err) {
    console.error('analisar-exame falhou:', err);
    res.status(502).json({ error: 'Não foi possível analisar o PDF agora.' });
  }
});
