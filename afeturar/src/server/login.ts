import { db } from "@/lib/db";
import { HASH_FALSO, verificarSenha } from "./senha";

export const MAX_FALHAS = 5;
export const BLOQUEIO_MS = 15 * 60 * 1000;

export type ResultadoLogin =
  | { ok: true; usuario: { id: string; email: string; nome: string | null; papel: "ADMIN" | "EQUIPE" } }
  | { ok: false; motivo: "credenciais" | "bloqueado" };

/**
 * Login do painel. Mensagens genéricas (não revela se o e-mail existe), bloqueio temporário
 * após 5 falhas seguidas e tempo de resposta parecido para e-mails inexistentes.
 */
export async function autenticarPainel(emailBruto: string, senha: string): Promise<ResultadoLogin> {
  const email = emailBruto.trim().toLowerCase();
  const usuario = await db.usuario.findUnique({ where: { email } });

  if (usuario?.bloqueadoAte && usuario.bloqueadoAte > new Date()) {
    await verificarSenha(senha, HASH_FALSO);
    return { ok: false, motivo: "bloqueado" };
  }

  const senhaOk = await verificarSenha(senha, usuario?.senhaHash ?? HASH_FALSO);
  const podeEntrar = !!usuario && senhaOk && usuario.ativo && (usuario.papel === "ADMIN" || usuario.papel === "EQUIPE");

  if (!podeEntrar) {
    if (usuario) {
      const atualizado = await db.usuario.update({ where: { id: usuario.id }, data: { falhasLogin: { increment: 1 } } });
      if (atualizado.falhasLogin >= MAX_FALHAS) {
        await db.usuario.update({ where: { id: usuario.id }, data: { falhasLogin: 0, bloqueadoAte: new Date(Date.now() + BLOQUEIO_MS) } });
        return { ok: false, motivo: "bloqueado" };
      }
    }
    return { ok: false, motivo: "credenciais" };
  }

  await db.usuario.update({ where: { id: usuario.id }, data: { falhasLogin: 0, bloqueadoAte: null } });
  return { ok: true, usuario: { id: usuario.id, email: usuario.email, nome: usuario.nome, papel: usuario.papel as "ADMIN" | "EQUIPE" } };
}
