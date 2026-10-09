"use client";

import { useActionState } from "react";
import { entrar, type EstadoLogin } from "./actions";

export function FormLogin() {
  const [estado, acao, pendente] = useActionState<EstadoLogin, FormData>(entrar, {});
  return (
    <form action={acao} className="mt-8 space-y-4" noValidate>
      <div>
        <label htmlFor="email" className="mb-1 block text-sm font-medium">E-mail</label>
        <input id="email" name="email" type="email" autoComplete="username" required defaultValue={estado.email} className="campo" aria-invalid={!!estado.erro} />
      </div>
      <div>
        <label htmlFor="senha" className="mb-1 block text-sm font-medium">Senha</label>
        <input id="senha" name="senha" type="password" autoComplete="current-password" required className="campo" aria-invalid={!!estado.erro} aria-describedby={estado.erro ? "login-erro" : undefined} />
      </div>
      <p id="login-erro" role="alert" className="min-h-5 text-sm text-erro">{estado.erro}</p>
      <button type="submit" disabled={pendente} className="btn btn-primary w-full">{pendente ? "Entrando…" : "Entrar"}</button>
    </form>
  );
}
