"use client";

import { useActionState, useEffect, useRef } from "react";
import { aoEnviar, BotaoEnvio, Campo, MensagemEstado, propsCampo, type Estado } from "@/components/admin/Ui";
import { removerCor, salvarCor } from "./actions";

export interface CorLinha { id: string; nome: string; hex: string | null; ativa: boolean; emUso: number }

export function FormCor({ cor }: { cor?: CorLinha }) {
  const [estado, acao, pendente] = useActionState<Estado, FormData>(salvarCor, {});
  const formRef = useRef<HTMLFormElement>(null);
  useEffect(() => { if (estado.ok && !cor) formRef.current?.reset(); }, [estado, cor]);
  const [estadoDel, acaoDel, pendenteDel] = useActionState<Estado, FormData>(removerCor, {});
  const k = cor?.id ?? "nova";
  return (
    <div className="space-y-3">
      <form ref={formRef} onSubmit={aoEnviar(acao)} className="grid gap-3 sm:grid-cols-3" noValidate>
        {cor && <input type="hidden" name="id" value={cor.id} />}
        <Campo id={`${k}-nome`} label="Nome da cor" erro={estado.erros?.nome}><input {...propsCampo(`${k}-nome`, estado.erros?.nome)} name="nome" defaultValue={cor?.nome} required className="campo" /></Campo>
        <Campo id={`${k}-hex`} label="Tom do mostruário" erro={estado.erros?.hex} dica="Formato #RRGGBB. Só para a bolinha de cor na loja; deixe vazio para Mármore e similares."><input {...propsCampo(`${k}-hex`, estado.erros?.hex)} name="hex" defaultValue={cor?.hex ?? ""} placeholder="#c1846f" className="campo" /></Campo>
        <label className="flex min-h-11 items-center gap-2 self-end text-sm"><input type="checkbox" name="ativa" defaultChecked={cor?.ativa ?? true} className="size-5 accent-terracota-escuro" /> Disponível para novos produtos</label>
        <div className="sm:col-span-3"><BotaoEnvio pendente={pendente}>{cor ? "Salvar" : "Criar cor"}</BotaoEnvio></div>
      </form>
      <MensagemEstado estado={estado} />
      {cor && (
        <form onSubmit={aoEnviar(acaoDel)} className="border-t border-linha pt-3">
          <input type="hidden" name="id" value={cor.id} />
          <BotaoEnvio pendente={pendenteDel} className="btn btn-secondary" pendenteTexto="Excluindo…">Excluir cor</BotaoEnvio>
          <span className="ml-3 text-xs text-marrom-suave">Usada em {cor.emUso} variação(ões)</span>
          <div className="mt-2"><MensagemEstado estado={estadoDel} /></div>
        </form>
      )}
    </div>
  );
}
