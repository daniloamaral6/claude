"use server";

import { redirect } from "next/navigation";
import { executar, type Estado } from "@/server/acao";
import { iniciarSessaoCliente, sairCliente } from "@/server/auth-cliente";
import { ErroNegocio } from "@/server/categorias";
import { autenticarCliente, redefinirSenha, registrarCliente, solicitarRecuperacao } from "@/server/clientes";
import { localizarPedido } from "@/server/checkout";
import { ipDoCliente, permitir } from "@/server/limite";

const texto = (fd: FormData, k: string) => String(fd.get(k) ?? "");
async function limite(acao: string, max: number) {
  if (!permitir(`${acao}:${await ipDoCliente()}`, max, 15 * 60_000)) throw new ErroNegocio("Muitas tentativas. Aguarde alguns minutos e tente de novo.");
}

export async function entrar(_: Estado, fd: FormData): Promise<Estado> {
  const estado = await executar(async () => {
    await limite("login-cliente", 20);
    const email = texto(fd, "email"), senha = texto(fd, "senha");
    if (!email || !senha || senha.length > 200) throw new ErroNegocio("Informe e-mail e senha.");
    const r = await autenticarCliente(email, senha);
    if (!r.ok) throw new ErroNegocio(r.motivo === "bloqueado" ? "Muitas tentativas. Aguarde 15 minutos e tente novamente." : "E-mail ou senha incorretos.");
    await iniciarSessaoCliente(r.usuario.id);
  });
  if (!estado.erro) redirect("/conta");
  return estado;
}

export async function cadastrar(_: Estado, fd: FormData): Promise<Estado> {
  const estado = await executar(async () => {
    await limite("cadastro-cliente", 8);
    const u = await registrarCliente({ nome: texto(fd, "nome"), email: texto(fd, "email"), senha: texto(fd, "senha"), aceitouTermos: fd.get("aceitouTermos") === "on" });
    await iniciarSessaoCliente(u.id);
  });
  if (!estado.erro) redirect("/conta");
  return estado;
}

export async function sair() { await sairCliente(); redirect("/conta"); }

export async function pedirRecuperacao(_: Estado, fd: FormData): Promise<Estado> {
  return executar(async () => {
    await limite("recuperar-senha", 6);
    await solicitarRecuperacao(texto(fd, "email"));
    return "Se esse e-mail tiver cadastro, enviamos um link para criar uma nova senha. Confira também a caixa de spam.";
  });
}

export async function redefinir(_: Estado, fd: FormData): Promise<Estado> {
  const estado = await executar(async () => {
    await limite("redefinir-senha", 10);
    const senha = texto(fd, "senha");
    if (senha !== texto(fd, "confirmacao")) throw new ErroNegocio("As senhas não são iguais.");
    await redefinirSenha(texto(fd, "token"), senha);
  });
  if (!estado.erro) redirect("/conta?senha=redefinida");
  return estado;
}

export async function acompanhar(_: Estado, fd: FormData): Promise<Estado> {
  let destino: string | null = null;
  const estado = await executar(async () => {
    await limite("acompanhar", 15);
    const p = await localizarPedido(Number(texto(fd, "numero").replace(/\D/g, "")), texto(fd, "email"));
    destino = `/pedido/${p.numero}?c=${p.tokenAcesso}`;
  });
  if (destino) redirect(destino);
  return estado;
}
