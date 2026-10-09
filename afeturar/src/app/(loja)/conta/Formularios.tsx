"use client";

import Link from "next/link";
import { useActionState } from "react";
import { aoEnviar, BotaoEnvio, Campo, MensagemEstado, propsCampo, type Estado } from "@/components/admin/Ui";
import { acompanhar, cadastrar, entrar, pedirRecuperacao, redefinir } from "./actions";

export function FormEntrar() {
  const [estado, acao, pendente] = useActionState<Estado, FormData>(entrar, {});
  return (
    <form onSubmit={aoEnviar(acao)} noValidate className="space-y-4">
      <Campo id="entrar-email" label="E-mail"><input {...propsCampo("entrar-email", estado.erro)} name="email" type="email" autoComplete="username" required className="campo" /></Campo>
      <Campo id="entrar-senha" label="Senha"><input {...propsCampo("entrar-senha", estado.erro)} name="senha" type="password" autoComplete="current-password" required className="campo" /></Campo>
      <MensagemEstado estado={estado} />
      <BotaoEnvio pendente={pendente} pendenteTexto="Entrando…">Entrar</BotaoEnvio>
      <p className="text-sm"><Link href="/conta/recuperar" className="underline underline-offset-4">Esqueci minha senha</Link></p>
    </form>
  );
}

export function FormCadastrar() {
  const [estado, acao, pendente] = useActionState<Estado, FormData>(cadastrar, {});
  const e = estado.erros ?? {};
  return (
    <form onSubmit={aoEnviar(acao)} noValidate className="space-y-4">
      <Campo id="cad-nome" label="Nome completo" erro={e.nome}><input {...propsCampo("cad-nome", e.nome)} name="nome" autoComplete="name" required className="campo" /></Campo>
      <Campo id="cad-email" label="E-mail" erro={e.email}><input {...propsCampo("cad-email", e.email)} name="email" type="email" autoComplete="email" required className="campo" /></Campo>
      <Campo id="cad-senha" label="Senha" dica="Pelo menos 10 caracteres." erro={e.senha}><input {...propsCampo("cad-senha", e.senha, "d")} name="senha" type="password" autoComplete="new-password" required className="campo" /></Campo>
      <label className="flex items-start gap-3 text-sm"><input type="checkbox" name="aceitouTermos" className="mt-1 size-5 shrink-0 accent-terracota-escuro" /><span>Li e concordo com os <Link href="/termos-de-uso" target="_blank" className="underline">termos de uso</Link> e a <Link href="/politica-de-privacidade" target="_blank" className="underline">política de privacidade</Link>.</span></label>
      {e.aceitouTermos && <p role="alert" className="text-sm text-erro">{e.aceitouTermos}</p>}
      <MensagemEstado estado={estado} />
      <BotaoEnvio pendente={pendente} pendenteTexto="Criando…">Criar conta</BotaoEnvio>
    </form>
  );
}

export function FormRecuperar() {
  const [estado, acao, pendente] = useActionState<Estado, FormData>(pedirRecuperacao, {});
  return (
    <form onSubmit={aoEnviar(acao)} noValidate className="space-y-4">
      <Campo id="rec-email" label="E-mail da sua conta"><input {...propsCampo("rec-email")} name="email" type="email" autoComplete="email" required className="campo" /></Campo>
      <MensagemEstado estado={estado} />
      <BotaoEnvio pendente={pendente} pendenteTexto="Enviando…">Enviar link</BotaoEnvio>
    </form>
  );
}

export function FormRedefinir({ token }: { token: string }) {
  const [estado, acao, pendente] = useActionState<Estado, FormData>(redefinir, {});
  return (
    <form onSubmit={aoEnviar(acao)} noValidate className="space-y-4">
      <input type="hidden" name="token" value={token} />
      <Campo id="red-senha" label="Nova senha" dica="Pelo menos 10 caracteres."><input {...propsCampo("red-senha", undefined, "d")} name="senha" type="password" autoComplete="new-password" required className="campo" /></Campo>
      <Campo id="red-conf" label="Repita a nova senha"><input {...propsCampo("red-conf")} name="confirmacao" type="password" autoComplete="new-password" required className="campo" /></Campo>
      <MensagemEstado estado={estado} />
      <BotaoEnvio pendente={pendente} pendenteTexto="Salvando…">Salvar nova senha</BotaoEnvio>
    </form>
  );
}

export function FormAcompanhar() {
  const [estado, acao, pendente] = useActionState<Estado, FormData>(acompanhar, {});
  return (
    <form onSubmit={aoEnviar(acao)} noValidate className="space-y-4">
      <Campo id="ac-numero" label="Número do pedido"><input {...propsCampo("ac-numero")} name="numero" inputMode="numeric" autoComplete="off" required className="campo" /></Campo>
      <Campo id="ac-email" label="E-mail usado na compra"><input {...propsCampo("ac-email")} name="email" type="email" autoComplete="email" required className="campo" /></Campo>
      <MensagemEstado estado={estado} />
      <BotaoEnvio pendente={pendente} pendenteTexto="Procurando…">Ver pedido</BotaoEnvio>
    </form>
  );
}
