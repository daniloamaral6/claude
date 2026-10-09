"use client";

import { startTransition } from "react";
import { useFormStatus } from "react-dom";

import type { Estado } from "@/server/acao";
export type { Estado };

/**
 * Envia o formulário SEM usar `action=` no <form>: o React 19 zera os campos depois de toda ação
 * (inclusive com erro de validação), o que apagaria o que a pessoa digitou. Assim os valores ficam.
 */
export function aoEnviar(acao: (fd: FormData) => void) {
  return (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const fd = new FormData(e.currentTarget);
    startTransition(() => acao(fd));
  };
}

export function BotaoEnvio({ children, pendente, pendenteTexto = "Salvando…", className = "btn btn-primary" }: { children: React.ReactNode; pendente?: boolean; pendenteTexto?: string; className?: string }) {
  const { pending } = useFormStatus();
  const ocupado = pendente ?? pending;
  return <button type="submit" disabled={ocupado} aria-busy={ocupado} className={className}>{ocupado ? pendenteTexto : children}</button>;
}

export function Campo({
  id, label, erro, dica, children,
}: { id: string; label: string; erro?: string; dica?: string; children: React.ReactNode }) {
  return (
    <div>
      <label htmlFor={id} className="mb-1 block text-sm font-medium">{label}</label>
      {children}
      {dica && !erro && <p id={`${id}-dica`} className="mt-1 text-xs text-marrom-suave">{dica}</p>}
      {erro && <p id={`${id}-erro`} role="alert" className="mt-1 text-sm text-erro">{erro}</p>}
    </div>
  );
}

export function propsCampo(id: string, erro?: string, dica?: string) {
  return { id, name: id, "aria-invalid": !!erro, "aria-describedby": erro ? `${id}-erro` : dica ? `${id}-dica` : undefined } as const;
}

export function MensagemEstado({ estado }: { estado: Estado }) {
  if (!estado.erro && !estado.ok) return null;
  return (
    <p role={estado.erro ? "alert" : "status"} className={`rounded-lg border px-4 py-3 text-sm ${estado.erro ? "border-erro bg-white text-erro" : "border-terracota-escuro bg-white text-marrom"}`}>
      {estado.erro ?? estado.ok}
    </p>
  );
}

export function Secao({ titulo, id, children, acao }: { titulo: string; id: string; children: React.ReactNode; acao?: React.ReactNode }) {
  return (
    <section aria-labelledby={id} className="rounded-[var(--radius-card)] border border-linha bg-white p-5">
      <div className="mb-4 flex items-center justify-between gap-3">
        <h2 id={id} className="font-medium">{titulo}</h2>
        {acao}
      </div>
      <div className="space-y-4">{children}</div>
    </section>
  );
}
