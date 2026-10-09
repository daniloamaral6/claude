import { afterAll, beforeEach, describe, expect, it } from "vitest";
import { autenticarCliente, listarPedidosDoCliente, redefinirSenha, registrarCliente, solicitarRecuperacao, tokenRecuperacaoValido } from "../src/server/clientes";
import { cupomSchema, excluirCupom, salvarCupom, validarCupom } from "../src/server/cupons";
import { caixaDeSaida, transporteDeConsole } from "../src/server/email";
import { hashSenha } from "../src/server/senha";
import { criarSessao, validarSessao } from "../src/server/sessao";
import { dadosEntrega, limparBanco, prisma } from "./helpers";

beforeEach(async () => { await limparBanco(); caixaDeSaida.length = 0; });
afterAll(() => prisma.$disconnect());

const cad = { nome: "Ana Souza", email: "Ana@Exemplo.com", senha: "Vaso-Terracota-2026", aceitouTermos: true };
const tokenDoEmail = () => caixaDeSaida.at(-1)!.texto.match(/t=([A-Za-z0-9_-]+)/)![1];

describe("conta de cliente", () => {
  it("cadastra (e-mail em minúsculas, senha com hash, termos registrados) e entra", async () => {
    const u = await registrarCliente(cad);
    const salvo = await prisma.usuario.findUniqueOrThrow({ where: { id: u.id } });
    expect(salvo).toMatchObject({ email: "ana@exemplo.com", papel: "CLIENTE", nome: "Ana Souza" });
    expect(salvo.senhaHash).toMatch(/^scrypt\$/); expect(salvo.aceitouTermosEm).not.toBeNull();
    expect((await autenticarCliente("ANA@exemplo.com", cad.senha)).ok).toBe(true);
    expect((await autenticarCliente("ana@exemplo.com", "errada-errada")).ok).toBe(false);
  });
  it("recusa e-mail repetido, senha fraca, termos não aceitos e dados inválidos", async () => {
    await registrarCliente(cad);
    await expect(registrarCliente({ ...cad, email: "ana@exemplo.com" })).rejects.toThrow(/já tem cadastro/);
    await expect(registrarCliente({ ...cad, email: "b@x.com", senha: "curta" })).rejects.toThrow(/10 caracteres/);
    await expect(registrarCliente({ ...cad, email: "c@x.com", aceitouTermos: false })).rejects.toThrow();
    await expect(registrarCliente({ ...cad, email: "sem-arroba" })).rejects.toThrow();
    expect(await prisma.usuario.count()).toBe(1);
  });
  it("cliente não entra pelo painel e administrador não entra como cliente", async () => {
    await registrarCliente(cad);
    const { autenticarPainel } = await import("../src/server/login");
    expect((await autenticarPainel("ana@exemplo.com", cad.senha)).ok).toBe(false);
    await prisma.usuario.create({ data: { email: "adm@x.com", papel: "ADMIN", senhaHash: await hashSenha("Senha-Forte-123") } });
    expect((await autenticarCliente("adm@x.com", "Senha-Forte-123")).ok).toBe(false);
  });
  it("lista só os pedidos do próprio cliente", async () => {
    const a = await registrarCliente(cad), b = await registrarCliente({ ...cad, email: "b@x.com" });
    const mk = (usuarioId: string) => prisma.pedido.create({ data: { usuarioId, email: "x@x.com", nome: "X", aceitouTermosEm: new Date(), subtotalCentavos: 100, totalCentavos: 100, ...dadosEntrega } });
    await mk(a.id); await mk(a.id); await mk(b.id);
    expect(await listarPedidosDoCliente(a.id)).toHaveLength(2);
    expect(await listarPedidosDoCliente(b.id)).toHaveLength(1);
  });
});

describe("recuperação de senha", () => {
  it("envia link que vale 1 vez, troca a senha e derruba sessões antigas", async () => {
    const u = await registrarCliente(cad);
    const { token: sessao } = await criarSessao(u.id);
    await solicitarRecuperacao("ana@exemplo.com", transporteDeConsole);
    expect(caixaDeSaida).toHaveLength(1);
    const t = tokenDoEmail();
    expect(await tokenRecuperacaoValido(t)).toBe(true);
    expect((await prisma.recuperacaoSenha.findFirstOrThrow()).tokenHash).not.toContain(t); // só o hash fica no banco
    await expect(redefinirSenha(t, "curta")).rejects.toThrow(/10 caracteres/);
    await redefinirSenha(t, "Nova-Senha-Segura-9");
    expect((await autenticarCliente("ana@exemplo.com", "Nova-Senha-Segura-9")).ok).toBe(true);
    expect((await autenticarCliente("ana@exemplo.com", cad.senha)).ok).toBe(false);
    expect(await validarSessao(sessao)).toBeNull();
    await expect(redefinirSenha(t, "Outra-Senha-Segura-9")).rejects.toThrow(/expirou ou já foi usado/);
    expect(await tokenRecuperacaoValido(t)).toBe(false);
  });
  it("não revela se o e-mail existe, ignora contas que não são de cliente e limita pedidos por hora", async () => {
    await solicitarRecuperacao("naoexiste@x.com", transporteDeConsole);
    await solicitarRecuperacao("lixo", transporteDeConsole);
    await prisma.usuario.create({ data: { email: "adm@x.com", papel: "ADMIN" } });
    await solicitarRecuperacao("adm@x.com", transporteDeConsole);
    expect(caixaDeSaida).toHaveLength(0);
    await registrarCliente(cad);
    for (let i = 0; i < 6; i++) await solicitarRecuperacao("ana@exemplo.com", transporteDeConsole);
    expect(caixaDeSaida).toHaveLength(3);
  });
  it("um pedido novo invalida o link anterior; link vencido e token falso não funcionam", async () => {
    await registrarCliente(cad);
    await solicitarRecuperacao("ana@exemplo.com", transporteDeConsole); const velho = tokenDoEmail();
    await solicitarRecuperacao("ana@exemplo.com", transporteDeConsole); const novo = tokenDoEmail();
    expect(await tokenRecuperacaoValido(velho)).toBe(false);
    expect(await tokenRecuperacaoValido(novo)).toBe(true);
    await prisma.recuperacaoSenha.updateMany({ data: { expiraEm: new Date(Date.now() - 1000) } });
    await expect(redefinirSenha(novo, "Nova-Senha-Segura-9")).rejects.toThrow(/expirou/);
    for (const falso of ["", "x", "a".repeat(30), "a".repeat(200)]) { expect(await tokenRecuperacaoValido(falso)).toBe(false); await expect(redefinirSenha(falso, "Nova-Senha-Segura-9")).rejects.toThrow(); }
  });
  it("dois cliques simultâneos no link só trocam a senha uma vez", async () => {
    await registrarCliente(cad);
    await solicitarRecuperacao("ana@exemplo.com", transporteDeConsole); const t = tokenDoEmail();
    const r = await Promise.allSettled([redefinirSenha(t, "Senha-A-Segura-123"), redefinirSenha(t, "Senha-B-Segura-123")]);
    expect(r.filter((x) => x.status === "fulfilled")).toHaveLength(1);
  });
});

describe("cupons (administração)", () => {
  it("valida regras de cada tipo e normaliza o código", () => {
    const base = { codigo: " bem 10 ", tipo: "PERCENTUAL" as const, valor: 10, minimoCentavos: null, usoMaximo: null, inicioEm: null, fimEm: null, ativo: true };
    expect(cupomSchema.parse(base).codigo).toBe("BEM10");
    for (const ruim of [{ ...base, valor: 0 }, { ...base, valor: 101 }, { ...base, tipo: "VALOR_FIXO" as const, valor: 0 }, { ...base, codigo: "ab" }, { ...base, codigo: "tem$simbolo" }, { ...base, inicioEm: "2026-10-10", fimEm: "2026-10-01" }, { ...base, usoMaximo: 0 }]) expect(cupomSchema.safeParse(ruim).success).toBe(false);
    expect(cupomSchema.safeParse({ ...base, tipo: "FRETE_GRATIS", valor: 0 }).success).toBe(true);
  });
  it("cria, atualiza, não duplica código; excluir desativa se já usado em pedido", async () => {
    const adm = await prisma.usuario.create({ data: { email: "a@a.com", papel: "ADMIN" } });
    const dados = { codigo: "natal", tipo: "PERCENTUAL", valor: 15, minimoCentavos: 10000, usoMaximo: 50, inicioEm: null, fimEm: null, ativo: true };
    const c = await salvarCupom(null, dados, adm.id);
    expect(c.codigo).toBe("NATAL");
    await expect(salvarCupom(null, { ...dados, codigo: "NATAL" }, adm.id)).rejects.toThrow(/Já existe/);
    expect((await salvarCupom(c.id, { ...dados, valor: 20 }, adm.id)).valor).toBe(20);
    expect((await validarCupom("natal", 20000)).descontoCentavos).toBe(4000);
    await prisma.pedido.create({ data: { email: "x@x.com", nome: "X", aceitouTermosEm: new Date(), subtotalCentavos: 100, totalCentavos: 100, cupomId: c.id, ...dadosEntrega } });
    expect((await excluirCupom(c.id, adm.id)).excluido).toBe(false);
    expect((await prisma.cupom.findUniqueOrThrow({ where: { id: c.id } })).ativo).toBe(false);
    const limpo = await salvarCupom(null, { ...dados, codigo: "OUTRO" }, adm.id);
    expect((await excluirCupom(limpo.id, adm.id)).excluido).toBe(true);
  });
});
