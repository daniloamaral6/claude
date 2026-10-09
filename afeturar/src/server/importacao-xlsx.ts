import ExcelJS from "exceljs";
import { mapearCabecalhos, type Linha } from "./importacao";

/** Lê a aba "Produtos" da planilha modelo e devolve as linhas com chaves internas. */
export async function lerPlanilha(caminhoOuBuffer: string | Buffer): Promise<Linha[]> {
  const wb = new ExcelJS.Workbook();
  if (typeof caminhoOuBuffer === "string") await wb.xlsx.readFile(caminhoOuBuffer);
  else await wb.xlsx.load(caminhoOuBuffer as unknown as ArrayBuffer);
  const ws = wb.getWorksheet("Produtos");
  if (!ws) throw new Error('A planilha precisa ter uma aba chamada "Produtos".');
  const cab = ws.getRow(1).values as unknown[]; // exceljs: índice 1 = coluna A
  const mapa = mapearCabecalhos(cab.slice(1));
  if (!Object.values(mapa).includes("nome")) throw new Error('Não encontrei a coluna "Produto" na aba Produtos.');
  const linhas: Linha[] = [];
  ws.eachRow({ includeEmpty: false }, (row, n) => {
    if (n === 1) return;
    const celulas: Record<string, unknown> = {};
    row.eachCell({ includeEmpty: false }, (cell, col) => {
      const chave = mapa[col - 1];
      if (!chave) return;
      let v: unknown = cell.value;
      if (v && typeof v === "object" && "result" in (v as object)) v = (v as { result: unknown }).result; // fórmula
      if (v && typeof v === "object" && "richText" in (v as object)) v = (v as { richText: { text: string }[] }).richText.map((t) => t.text).join("");
      celulas[chave] = v;
    });
    linhas.push({ numero: n, celulas });
  });
  return linhas;
}
