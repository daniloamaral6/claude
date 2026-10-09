import { mkdtemp, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import ExcelJS from "exceljs";
import { afterAll, beforeEach, describe, expect, it } from "vitest";
import { seedBase } from "../prisma/seed-base";
import { processarLinhas, type Linha, type Referencias } from "../src/server/importacao";
import { aplicarImportacao, carregarReferencias } from "../src/server/importacao-aplicar";
import { lerPlanilha } from "../src/server/importacao-xlsx";
import { limparBanco, prisma } from "./helpers";

const ref: Referencias = {
  categorias: [{ id: "c-casa", nome: "Casa & Decoração" }, { id: "c-pet", nome: "Pet" }],
  cores: [{ id: "k-branco", nome: "Branco" }],
};
const L = (numero: number, celulas: Record<string, unknown>): Linha => ({ numero, celulas });
const base = { nome: "Vaso Teste", categoria: "casa & decoracao", tipo: "Pronta entrega", preco: "49,90", estoque: 5 };

beforeEach(limparBanco);
afterAll(() => prisma.$disconnect());

describe("processarLinhas", () => {
  it("lê um produto com duas variações, cor nova, SKU automático e fotos", () => {
    const r = processarLinhas([
      L(2, { ...base, promocional: "44,90", caracteristicas: "Leve; Resistente", cor: "Branco", sku: "vaso-b", fotos: "a.jpg; b.jpg", pesoEmbalagemG: 120 }),
      L(3, { nome: "VASO TESTE", cor: "Terracota", estoque: 2, fotos: "c.jpg" }),
    ], ref);
    expect(r.erros).toEqual([]);
    expect(r.produtos).toHaveLength(1);
    const p = r.produtos[0];
    expect(p.entrada).toMatchObject({ nome: "Vaso Teste", categoriaId: "c-casa", tipo: "PRONTA_ENTREGA", precoCentavos: 4990, precoPromocionalCentavos: 4490, ativo: false, pesoEmbalagemG: 120 });
    expect(p.entrada.caracteristicas).toEqual(["Leve", "Resistente"]);
    expect(p.entrada.variacoes.map((v) => v.sku)).toEqual(["VASO-B", "AFT-0001"]);
    expect(p.entrada.variacoes[0].corId).toBe("k-branco");
    expect(p.entrada.variacoes[1].corId).toBe("nova:Terracota");
    expect(p.coresNovas).toEqual(["Terracota"]);
    expect(p.fotos).toEqual([{ sku: "VASO-B", arquivo: "a.jpg" }, { sku: "VASO-B", arquivo: "b.jpg" }, { sku: "AFT-0001", arquivo: "c.jpg" }]);
  });

  it("aponta cada erro na linha certa, sem parar nos primeiros", () => {
    const r = processarLinhas([
      L(2, { ...base, nome: "Sem categoria", categoria: "" }),
      L(3, { ...base, nome: "Categoria errada", categoria: "Brinquedos" }),
      L(4, { ...base, nome: "Preço ruim", preco: "abc" }),
      L(5, { ...base, nome: "Sem tipo", tipo: "" }),
      L(6, { ...base, nome: "Sem estoque", estoque: undefined }),
      L(7, { ...base, nome: "Promoção alta", promocional: "60,00" }),
      L(8, { ...base, nome: "Estoque negativo", estoque: -1 }),
      L(9, { ...base, nome: "Personaliza sem rótulo", personalizavel: "Sim" }),
    ], ref);
    const por = (n: string) => r.erros.filter((e) => e.produto === n).map((e) => `${e.linha}:${e.campo}`);
    expect(por("Sem categoria")).toEqual(["2:Categoria da loja"]);
    expect(por("Categoria errada")[0]).toBe("3:Categoria da loja");
    expect(por("Preço ruim")).toContain("4:Preço de venda");
    expect(por("Sem tipo")).toEqual(["5:Disponibilidade"]);
    expect(por("Sem estoque")).toEqual(["6:Estoque"]);
    expect(por("Promoção alta")[0]).toMatch(/^7:/);
    expect(por("Estoque negativo")).toEqual(["8:Estoque"]);
    expect(por("Personaliza sem rótulo")).toEqual(["9:Campo de personalização"]);
    expect(r.produtos).toHaveLength(0);
  });

  it("erro numa variação aponta a linha da variação", () => {
    const r = processarLinhas([L(2, base), L(3, { nome: "Vaso Teste", estoque: "x" })], ref);
    expect(r.erros).toEqual([expect.objectContaining({ linha: 3, campo: "Estoque" })]);
  });

  it("ignora 'Não', linhas vazias e trata medida 0 como não informada; sob encomenda não exige estoque", () => {
    const r = processarLinhas([
      L(2, { ...base, nome: "Fora", incluir: "Não" }),
      L(3, {}),
      L(4, { ...base, nome: "Encomenda", tipo: "Sob encomenda", estoque: undefined, larguraMm: 0, alturaMm: 80 }),
    ], ref);
    expect(r.ignorados).toHaveLength(1);
    expect(r.erros).toEqual([]);
    expect(r.produtos[0].entrada).toMatchObject({ tipo: "SOB_ENCOMENDA", larguraMm: null, alturaMm: 80 });
  });

  it("não aceita SKU repetido entre produtos", () => {
    const r = processarLinhas([L(2, { ...base, nome: "A", sku: "X-1" }), L(3, { ...base, nome: "B", sku: "x-1" })], ref);
    expect(r.erros.length + r.produtos.length).toBeGreaterThan(0);
    expect(new Set(r.produtos.flatMap((p) => p.entrada.variacoes.map((v) => v.sku))).size).toBe(r.produtos.length);
  });

  it("avisa (sem bloquear) o que falta para um bom anúncio", () => {
    const r = processarLinhas([L(2, base)], ref);
    expect(r.avisos.map((a) => a.mensagem).join(" ")).toMatch(/fotos/);
    expect(r.avisos.map((a) => a.mensagem).join(" ")).toMatch(/descrição/i);
    expect(r.avisos.map((a) => a.mensagem).join(" ")).toMatch(/embalagem/);
  });
});

describe("planilha modelo (27 itens do app)", () => {
  it("vem sem custos e aponta o que falta preencher", async () => {
    const linhas = await lerPlanilha("docs/catalogo/modelo-catalogo-afeturar.xlsx");
    expect(linhas).toHaveLength(27);
    const colunas = new Set(linhas.flatMap((l) => Object.keys(l.celulas)));
    for (const proibida of ["custo", "margem", "filamento", "impressora", "hours"]) expect([...colunas].join(",")).not.toContain(proibida);
    const r = processarLinhas(linhas, { categorias: [{ id: "x", nome: "Casa & Decoração" }, { id: "y", nome: "Organização" }, { id: "z", nome: "Beleza & Acessórios" }, { id: "p", nome: "Pet" }, { id: "f", nome: "Fé" }, { id: "pe", nome: "Personalizados" }], cores: [] });
    expect(r.ignorados.map((i) => i.produto)).toEqual(["Defletor de Purga"]);
    expect(r.produtos).toHaveLength(0);
    expect(new Set(r.erros.map((e) => e.produto)).size).toBe(26);
    expect(r.erros.every((e) => ["Disponibilidade", "Estoque"].includes(e.campo))).toBe(true);
  });

  it("importa os 26 produtos como rascunho depois de preenchidos, com fotos, e é idempotente", async () => {
    await seedBase(prisma);
    const admin = await prisma.usuario.create({ data: { email: "a@a.com", papel: "ADMIN" } });
    const pasta = await mkdtemp(path.join(os.tmpdir(), "fotos-"));
    const png = Buffer.concat([Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]), Buffer.alloc(40)]);
    await writeFile(path.join(pasta, "foto1.png"), png);

    const wb = new ExcelJS.Workbook();
    await wb.xlsx.readFile("docs/catalogo/modelo-catalogo-afeturar.xlsx");
    const ws = wb.getWorksheet("Produtos")!;
    const cab = Array.from(ws.getRow(1).values as unknown[], (h) => String(h ?? ""));
    const c = (inicio: string) => cab.findIndex((h) => h.startsWith(inicio));
    for (let r = 2; r <= ws.rowCount; r++) {
      ws.getRow(r).getCell(c("Disponibilidade")).value = "Pronta entrega";
      ws.getRow(r).getCell(c("Estoque")).value = 3;
    }
    ws.getRow(2).getCell(c("Fotos")).value = "foto1.png; nao-existe.jpg";
    ws.getRow(2).getCell(c("Cor")).value = "Terracota";
    const arq = path.join(pasta, "planilha.xlsx");
    await wb.xlsx.writeFile(arq);

    const res = processarLinhas(await lerPlanilha(arq), await carregarReferencias());
    expect(res.erros).toEqual([]);
    expect(res.produtos).toHaveLength(26);

    const rel = await aplicarImportacao(res, admin.id, pasta);
    expect(rel.criados).toHaveLength(26);
    expect(rel.coresCriadas).toEqual(["Terracota"]);
    expect(rel.fotosAdicionadas).toBe(1);
    expect(rel.avisos.join(" ")).toMatch(/nao-existe\.jpg/);
    expect(await prisma.produto.count({ where: { ativo: true } })).toBe(0); // nada é publicado
    expect(await prisma.produto.count()).toBe(26);
    expect(await prisma.variacao.count()).toBe(26);
    const bandeja = await prisma.produto.findFirstOrThrow({ where: { nome: { startsWith: "Bandeija" } } });
    expect([bandeja.larguraMm, bandeja.profundidadeMm, bandeja.alturaMm]).toEqual([215, 130, null]);

    const de_novo = await aplicarImportacao(res, admin.id, pasta);
    expect(de_novo.criados).toHaveLength(0);
    expect(de_novo.jaExistiam).toHaveLength(26);
    expect(await prisma.produto.count()).toBe(26);
  });

  it("recusa aplicar quando há erros", async () => {
    const admin = await prisma.usuario.create({ data: { email: "a@a.com", papel: "ADMIN" } });
    const res = processarLinhas([L(2, { ...base, preco: "x" })], ref);
    await expect(aplicarImportacao(res, admin.id)).rejects.toThrow(/erros/);
  });
});
