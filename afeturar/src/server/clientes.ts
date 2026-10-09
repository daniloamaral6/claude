import { createHash, randomBytes } from "node:crypto";
import { z } from "zod";
import { db } from "@/lib/db";
import { emailValido } from "@/lib/validacoes";
import { site } from "@/lib/site";
import { ErroNegocio } from "./categorias";
import { enviarEmailSeguro, transporteDeEmail, type TransporteEmail } from "./email";
import { emailRecuperarSenha } from "./email/modelos";
import { autenticar } from "./login";
import { hashSenha, validarForcaSenha } from "./senha";
import { encerrarTodasAsSessoes } from "./sessao";

const hash = (t: string) => createHash("sha256").update(t).digest("hex");

export const cadastroSchema = z.object({
  nome: z.string().trim().min(2, "Informe seu nome.").max(120),
  email: z.string().trim().toLowerCase().refine(emailValido, "E-mail inválido."),
  senha: z.string().min(1, "Crie uma senha.").max(200),
  aceitouTermos: z.literal(true, { error: "É preciso aceitar os termos para criar a conta." }),
});

/** Cria conta de cliente. Ainda sem confirmação de e-mail: por isso NÃO ligamos pedidos antigos à conta automaticamente. */
export async function registrarCliente(entrada: unknown) {
  const d = cadastroSchema.parse(entrada);
  const problema = validarForcaSenha(d.senha, d.email);
  if (problema) throw new ErroNegocio(problema);
  if (await db.usuario.findUnique({ where: { email: d.email } })) throw new ErroNegocio("Este e-mail já tem cadastro. Entre na sua conta ou recupere a senha.");
  try {
    return await db.usuario.create({ data: { email: d.email, nome: d.nome, senhaHash: await hashSenha(d.senha), papel: "CLIENTE", aceitouTermosEm: new Date() }, select: { id: true, email: true, nome: true } });
  } catch (e) {
    if ((e as { code?: string }).code === "P2002") throw new ErroNegocio("Este e-mail já tem cadastro. Entre na sua conta ou recupere a senha.");
    throw e;
  }
}

export const autenticarCliente = (email: string, senha: string) => autenticar(email, senha, ["CLIENTE"]);

const RECUPERACAO_MS = 60 * 60 * 1000;
const MAX_PEDIDOS_POR_HORA = 3;

/** Sempre "funciona" por fora (não revela se o e-mail existe). Só envia se for conta de cliente ativa. */
export async function solicitarRecuperacao(emailBruto: string, email: TransporteEmail | null = transporteDeEmail()) {
  const e = emailBruto.trim().toLowerCase();
  if (!emailValido(e)) return;
  const u = await db.usuario.findUnique({ where: { email: e } });
  if (!u || !u.ativo || u.papel !== "CLIENTE") return;
  const recentes = await db.recuperacaoSenha.count({ where: { usuarioId: u.id, criadoEm: { gt: new Date(Date.now() - RECUPERACAO_MS) } } });
  if (recentes >= MAX_PEDIDOS_POR_HORA) return;
  const token = randomBytes(32).toString("base64url");
  await db.$transaction([
    db.recuperacaoSenha.updateMany({ where: { usuarioId: u.id, usadoEm: null }, data: { usadoEm: new Date() } }), // links antigos deixam de valer
    db.recuperacaoSenha.create({ data: { usuarioId: u.id, tokenHash: hash(token), expiraEm: new Date(Date.now() + RECUPERACAO_MS) } }),
  ]);
  await enviarEmailSeguro(emailRecuperarSenha(u.email, u.nome, `${site.url}/conta/redefinir?t=${token}`), email);
}

export async function tokenRecuperacaoValido(token: string) {
  if (!token || token.length < 20 || token.length > 100) return false;
  const r = await db.recuperacaoSenha.findUnique({ where: { tokenHash: hash(token) } });
  return !!r && !r.usadoEm && r.expiraEm > new Date();
}

export async function redefinirSenha(token: string, novaSenha: string) {
  const r = token && token.length >= 20 && token.length <= 100 ? await db.recuperacaoSenha.findUnique({ where: { tokenHash: hash(token) }, include: { usuario: true } }) : null;
  if (!r || r.usadoEm || r.expiraEm <= new Date() || !r.usuario.ativo) throw new ErroNegocio("Este link expirou ou já foi usado. Peça um novo.");
  const problema = validarForcaSenha(novaSenha, r.usuario.email);
  if (problema) throw new ErroNegocio(problema);
  const senhaHash = await hashSenha(novaSenha);
  const usado = await db.recuperacaoSenha.updateMany({ where: { id: r.id, usadoEm: null }, data: { usadoEm: new Date() } }); // só um uso, mesmo com cliques simultâneos
  if (usado.count !== 1) throw new ErroNegocio("Este link expirou ou já foi usado. Peça um novo.");
  await db.usuario.update({ where: { id: r.usuarioId }, data: { senhaHash, falhasLogin: 0, bloqueadoAte: null } });
  await encerrarTodasAsSessoes(r.usuarioId); // quem tinha a senha antiga é deslogado
}

export const listarPedidosDoCliente = (usuarioId: string) =>
  db.pedido.findMany({ where: { usuarioId }, orderBy: { criadoEm: "desc" }, take: 50, select: { numero: true, status: true, totalCentavos: true, criadoEm: true, tokenAcesso: true, itens: { select: { nomeProduto: true, quantidade: true } } } });
