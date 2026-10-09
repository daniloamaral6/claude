"use server";

import { redirect } from "next/navigation";
import { iniciarSessaoNoCookie } from "@/server/auth";
import { autenticarPainel } from "@/server/login";

export type EstadoLogin = { erro?: string; email?: string };

export async function entrar(_: EstadoLogin, fd: FormData): Promise<EstadoLogin> {
  const email = String(fd.get("email") ?? "");
  const senha = String(fd.get("senha") ?? "");
  if (!email || !senha || senha.length > 200 || email.length > 200) return { erro: "Informe e-mail e senha.", email: email.slice(0, 200) };
  const r = await autenticarPainel(email, senha);
  if (!r.ok) {
    return { erro: r.motivo === "bloqueado" ? "Muitas tentativas. Aguarde 15 minutos e tente novamente." : "E-mail ou senha incorretos.", email: email.slice(0, 200) };
  }
  await iniciarSessaoNoCookie(r.usuario.id);
  redirect("/admin");
}
