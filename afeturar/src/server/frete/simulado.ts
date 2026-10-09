import type { ProvedorFrete } from "./tipos";

/** SOMENTE desenvolvimento/testes: valores fixos e previsíveis. Nunca é usado em produção (ver index.ts). */
export const freteSimulado: ProvedorFrete = {
  nome: "simulado",
  async cotar(_origem, destino, itens) {
    const unidades = itens.reduce((n, i) => n + i.quantidade, 0);
    const longe = destino.startsWith("0") || destino.startsWith("1") ? 0 : 800; // CEPs começando em 0/1 (SP) = "perto"
    return [
      { id: "simulado:pac", nome: "PAC (simulado)", empresa: "Simulação", precoCentavos: 1500 + longe + unidades * 100, prazoDias: 7 },
      { id: "simulado:sedex", nome: "SEDEX (simulado)", empresa: "Simulação", precoCentavos: 2800 + longe + unidades * 150, prazoDias: 2 },
    ];
  },
};
