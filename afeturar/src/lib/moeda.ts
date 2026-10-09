/** Converte texto digitado ("R$ 1.234,56", "49,9", "49") em centavos. Retorna null se inválido. */
export function textoParaCentavos(texto: string): number | null {
  const limpo = texto.replace(/R\$|\s/g, "");
  if (!limpo || !/^[\d.,]+$/.test(limpo)) return null;
  let normal: string;
  if (limpo.includes(",")) {
    if ((limpo.match(/,/g) ?? []).length > 1) return null;
    normal = limpo.replace(/\./g, "").replace(",", ".");
  } else if (/\.\d{1,2}$/.test(limpo)) {
    normal = limpo; // "49.90"
  } else {
    normal = limpo.replace(/\./g, ""); // "1.234" = mil duzentos e trinta e quatro
  }
  const [inteiro, decimal = ""] = normal.split(".");
  if (!/^\d+$/.test(inteiro) || !/^\d{0,2}$/.test(decimal)) return null;
  const centavos = Number(inteiro) * 100 + Number(decimal.padEnd(2, "0") || "0");
  return Number.isSafeInteger(centavos) ? centavos : null;
}

/** 4990 → "49,90" (sem o símbolo, para campos de formulário). */
export function centavosParaTexto(centavos: number | null | undefined): string {
  if (centavos == null) return "";
  return (centavos / 100).toLocaleString("pt-BR", { minimumFractionDigits: 2, maximumFractionDigits: 2, useGrouping: false });
}

/** 123456 → "R$ 1.234,56" */
export function formatarBRL(centavos: number): string {
  return (centavos / 100).toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
}
