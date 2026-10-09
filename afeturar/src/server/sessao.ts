import { createHash, randomBytes } from "node:crypto";
import { db } from "@/lib/db";

export const DURACAO_SESSAO_MS = 7 * 24 * 60 * 60 * 1000; // 7 dias

const hashToken = (token: string) => createHash("sha256").update(token).digest("hex");

/** Cria a sessão e devolve o token (que só existe no cookie; no banco fica apenas o hash). */
export async function criarSessao(usuarioId: string, userAgent?: string | null) {
  const token = randomBytes(32).toString("base64url");
  const expiraEm = new Date(Date.now() + DURACAO_SESSAO_MS);
  await db.sessao.create({ data: { usuarioId, tokenHash: hashToken(token), expiraEm, userAgent: userAgent?.slice(0, 300) } });
  return { token, expiraEm };
}

/** Retorna o usuário da sessão se o token for válido, a sessão não tiver expirado e a conta estiver ativa. */
export async function validarSessao(token: string | undefined | null) {
  if (!token || token.length < 20 || token.length > 100) return null;
  const sessao = await db.sessao.findUnique({
    where: { tokenHash: hashToken(token) },
    include: { usuario: { select: { id: true, email: true, nome: true, papel: true, ativo: true } } },
  });
  if (!sessao) return null;
  if (sessao.expiraEm <= new Date() || !sessao.usuario.ativo) {
    await db.sessao.delete({ where: { id: sessao.id } }).catch(() => {});
    return null;
  }
  return sessao.usuario;
}

export async function encerrarSessao(token: string | undefined | null) {
  if (!token) return;
  await db.sessao.deleteMany({ where: { tokenHash: hashToken(token) } });
}

export async function encerrarTodasAsSessoes(usuarioId: string) {
  await db.sessao.deleteMany({ where: { usuarioId } });
}

export async function limparSessoesExpiradas() {
  return (await db.sessao.deleteMany({ where: { expiraEm: { lt: new Date() } } })).count;
}
