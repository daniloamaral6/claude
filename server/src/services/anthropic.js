const API_URL = 'https://api.anthropic.com/v1/messages';
const MODEL = 'claude-sonnet-4-6';
const ANTHROPIC_VERSION = '2023-06-01';

const MEAL_PHOTO_PROMPT = "Você é um assistente de nutrição. Analise a foto de comida a seguir e estime, da forma mais realista possível, os valores nutricionais TOTAIS do prato mostrado (considerando a porção visível). Responda APENAS com um objeto JSON válido, sem texto antes ou depois, sem markdown, exatamente neste formato: {\"descricao\": \"breve descrição do prato em português, até 12 palavras\", \"calorias\": numero_inteiro, \"proteina_g\": numero, \"sodio_mg\": numero_inteiro, \"confianca\": \"baixa ou media ou alta\", \"observacao\": \"uma frase curta em português com ressalva sobre a estimativa\"}. Se não conseguir identificar bem os alimentos, ainda assim retorne uma estimativa aproximada com confianca baixa.";

const EXAM_PDF_PROMPT = "Você é um assistente que extrai dados de laudos médicos em PDF. O documento pode ser um exame de sangue (com um ou mais valores numéricos) ou um exame de imagem/procedimento (ultrassonografia, ecocardiograma, endoscopia, doppler, MAPA, radiografia, tomografia, ressonância etc). Extraia TODOS os exames/valores encontrados. Responda APENAS com um objeto JSON válido, sem texto antes ou depois, sem markdown, exatamente neste formato: {\"itens\": [ ... ]}. Cada item de exame de sangue deve seguir: {\"tipo\":\"sangue\",\"nome\":\"nome do exame em português, ex: TSH, LDL, Glicose\",\"valor\":numero,\"unidade\":\"ex: mg/dL\",\"refMin\":numero_ou_null,\"refMax\":numero_ou_null,\"data\":\"YYYY-MM-DD\"}. Cada item de exame de imagem/procedimento deve seguir: {\"tipo\":\"imagem\",\"nome\":\"tipo do exame, ex: Ultrassonografia do abdome total\",\"data\":\"YYYY-MM-DD\",\"conclusao\":\"resumo objetivo da impressão diagnóstica ou conclusão em português, em até 3 frases\",\"medico\":\"nome do médico responsável, ou null se não houver\"}. Use a data do exame encontrada no próprio documento, não a data de hoje. Se o laudo tiver vários valores de sangue, retorne um item para cada um. Se não conseguir ler algum campo com clareza, retorne null nesse campo em vez de inventar um valor.";

function getApiKey() {
  const key = process.env.ANTHROPIC_API_KEY;
  if (!key) {
    throw new Error('ANTHROPIC_API_KEY não configurada no ambiente do servidor');
  }
  return key;
}

function extractJson(data) {
  const textBlocks = (data.content || [])
    .filter((b) => b.type === 'text')
    .map((b) => b.text)
    .join('\n');
  const clean = textBlocks.replace(/```json|```/g, '').trim();
  return JSON.parse(clean);
}

async function callAnthropic(content, maxTokens) {
  const response = await fetch(API_URL, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-api-key': getApiKey(),
      'anthropic-version': ANTHROPIC_VERSION
    },
    body: JSON.stringify({
      model: MODEL,
      max_tokens: maxTokens,
      messages: [{ role: 'user', content }]
    })
  });

  if (!response.ok) {
    const errText = await response.text().catch(() => '');
    throw new Error(`Anthropic API respondeu ${response.status}: ${errText}`);
  }

  const data = await response.json();
  return extractJson(data);
}

export async function analyzeMealPhoto(base64, mediaType) {
  return callAnthropic(
    [
      { type: 'image', source: { type: 'base64', media_type: mediaType, data: base64 } },
      { type: 'text', text: MEAL_PHOTO_PROMPT }
    ],
    1000
  );
}

export async function analyzeExamPdf(base64) {
  return callAnthropic(
    [
      { type: 'document', source: { type: 'base64', media_type: 'application/pdf', data: base64 } },
      { type: 'text', text: EXAM_PDF_PROMPT }
    ],
    4000
  );
}
