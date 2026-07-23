async function request(method, url, body) {
  const res = await fetch(url, {
    method,
    headers: body !== undefined ? { 'Content-Type': 'application/json' } : undefined,
    body: body !== undefined ? JSON.stringify(body) : undefined
  });
  if (!res.ok) {
    const data = await res.json().catch(() => ({}));
    throw new Error(data.error || `Erro ${res.status}`);
  }
  if (res.status === 204) return null;
  return res.json();
}

export const api = {
  diario: {
    listEntries: () => request('GET', '/api/diario/entries'),
    upsertEntry: (date, patch) => request('PUT', `/api/diario/entries/${date}`, patch),
    deleteEntry: (date) => request('DELETE', `/api/diario/entries/${date}`),
    getMetas: () => request('GET', '/api/diario/metas'),
    saveMetas: (metas) => request('PUT', '/api/diario/metas', metas)
  },
  treino: {
    listForca: () => request('GET', '/api/treino/forca'),
    addForca: (entry) => request('POST', '/api/treino/forca', entry),
    deleteForca: (id) => request('DELETE', `/api/treino/forca/${id}`),
    listCardio: () => request('GET', '/api/treino/cardio'),
    addCardio: (entry) => request('POST', '/api/treino/cardio', entry),
    deleteCardio: (id) => request('DELETE', `/api/treino/cardio/${id}`)
  },
  exames: {
    listSangue: () => request('GET', '/api/exames/sangue'),
    addSangue: (itens) => request('POST', '/api/exames/sangue', itens),
    deleteSangue: (id) => request('DELETE', `/api/exames/sangue/${id}`),
    listImagem: () => request('GET', '/api/exames/imagem'),
    addImagem: (itens) => request('POST', '/api/exames/imagem', itens),
    deleteImagem: (id) => request('DELETE', `/api/exames/imagem/${id}`)
  },
  ai: {
    analisarFoto: (base64, mediaType) => request('POST', '/api/ai/analisar-foto', { base64, mediaType }),
    analisarExame: (base64) => request('POST', '/api/ai/analisar-exame', { base64 })
  }
};
