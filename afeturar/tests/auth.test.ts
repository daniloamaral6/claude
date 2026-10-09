import { afterAll, beforeEach, describe, expect, it } from "vitest";
import { MAX_FALHAS, autenticarPainel } from "../src/server/login";
import { hashSenha } from "../src/server/senha";
import { criarSessao, encerrarSessao, encerrarTodasAsSessoes, limparSessoesExpiradas, validarSessao } from "../src/server/sessao";
import { limparBanco, prisma } from "./helpers";

const SENHA = "Senha-Forte-123";
beforeEach(limparBanco);
afterAll(() => prisma.$disconnect());

async function criarUsuario(extra: Record<string, unknown> = {}) {
  return prisma.usuario.create({ data: { email: "admin@loja.com", senhaHash: await hashSenha(SENHA), papel: "ADMIN", ...extra } });
}

describe("login do painel", () => {
  it("entra com credenciais corretas (e-mail sem diferenciar maiúsculas)", async () => {
    await criarUsuario();
    const r = await autenticarPainel("  ADMIN@loja.com ", SENHA);
    expect(r.ok).toBe(true);
  });

  it("não revela se o e-mail existe", async () => {
    await criarUsuario();
    expect(await autenticarPainel("admin@loja.com", "errada-errada")).toEqual({ ok: false, motivo: "credenciais" });
    expect(await autenticarPainel("naoexiste@loja.com", "errada-errada")).toEqual({ ok: false, motivo: "credenciais" });
  });

  it("clientes não entram no painel, mesmo com a senha certa", async () => {
    await criarUsuario({ papel: "CLIENTE" });
    expect((await autenticarPainel("admin@loja.com", SENHA)).ok).toBe(false);
  });

  it("conta desativada não entra", async () => {
    await criarUsuario({ ativo: false });
    expect((await autenticarPainel("admin@loja.com", SENHA)).ok).toBe(false);
  });

  it("bloqueia após falhas seguidas, inclusive com a senha correta, e libera depois do prazo", async () => {
    const u = await criarUsuario();
    for (let i = 0; i < MAX_FALHAS - 1; i++) expect((await autenticarPainel(u.email, "errada-errada")).ok).toBe(false);
    expect(await autenticarPainel(u.email, "errada-errada")).toEqual({ ok: false, motivo: "bloqueado" });
    expect(await autenticarPainel(u.email, SENHA)).toEqual({ ok: false, motivo: "bloqueado" });
    await prisma.usuario.update({ where: { id: u.id }, data: { bloqueadoAte: new Date(Date.now() - 1000) } });
    expect((await autenticarPainel(u.email, SENHA)).ok).toBe(true);
  });

  it("login correto zera o contador de falhas", async () => {
    const u = await criarUsuario();
    await autenticarPainel(u.email, "errada-errada");
    await autenticarPainel(u.email, SENHA);
    expect((await prisma.usuario.findUniqueOrThrow({ where: { id: u.id } })).falhasLogin).toBe(0);
  });
});

describe("sessões", () => {
  it("valida o token e guarda só o hash no banco", async () => {
    const u = await criarUsuario();
    const { token } = await criarSessao(u.id, "teste");
    expect((await validarSessao(token))?.id).toBe(u.id);
    const salvo = await prisma.sessao.findFirstOrThrow();
    expect(salvo.tokenHash).not.toContain(token);
    expect(salvo.tokenHash).toHaveLength(64);
  });

  it("rejeita token inválido, vazio ou adulterado", async () => {
    const u = await criarUsuario();
    const { token } = await criarSessao(u.id);
    expect(await validarSessao(undefined)).toBeNull();
    expect(await validarSessao("")).toBeNull();
    expect(await validarSessao(token.slice(0, -2) + "xx")).toBeNull();
  });

  it("sessão expirada é rejeitada e removida", async () => {
    const u = await criarUsuario();
    const { token } = await criarSessao(u.id);
    await prisma.sessao.updateMany({ data: { expiraEm: new Date(Date.now() - 1000) } });
    expect(await validarSessao(token)).toBeNull();
    expect(await prisma.sessao.count()).toBe(0);
  });

  it("desativar a conta invalida as sessões existentes", async () => {
    const u = await criarUsuario();
    const { token } = await criarSessao(u.id);
    await prisma.usuario.update({ where: { id: u.id }, data: { ativo: false } });
    expect(await validarSessao(token)).toBeNull();
  });

  it("logout encerra a sessão; encerrar todas derruba as demais", async () => {
    const u = await criarUsuario();
    const a = await criarSessao(u.id);
    const b = await criarSessao(u.id);
    await encerrarSessao(a.token);
    expect(await validarSessao(a.token)).toBeNull();
    expect(await validarSessao(b.token)).not.toBeNull();
    await encerrarTodasAsSessoes(u.id);
    expect(await validarSessao(b.token)).toBeNull();
  });

  it("limpa sessões expiradas", async () => {
    const u = await criarUsuario();
    await criarSessao(u.id);
    await prisma.sessao.updateMany({ data: { expiraEm: new Date(Date.now() - 1000) } });
    expect(await limparSessoesExpiradas()).toBe(1);
  });
});
