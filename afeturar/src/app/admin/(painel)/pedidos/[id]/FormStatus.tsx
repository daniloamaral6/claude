"use client";

import { useActionState } from "react";
import { aoEnviar, BotaoEnvio, MensagemEstado, type Estado } from "@/components/admin/Ui";
import { gravarRastreio, mudarStatus } from "./actions";

export function FormStatus({ id, proximos, rastreio }: { id: string; proximos: { valor: string; nome: string }[]; rastreio: string }) {
  const [estado, acao, pendente] = useActionState<Estado, FormData>(mudarStatus, {});
  const [estadoR, acaoR, pendenteR] = useActionState<Estado, FormData>(gravarRastreio, {});
  return (
    <div className="space-y-6">
      <form onSubmit={aoEnviar(acaoR)} className="flex flex-wrap items-end gap-3" noValidate>
        <input type="hidden" name="id" value={id} />
        <div><label htmlFor="rastreio-salvar" className="mb-1 block text-sm font-medium">Código de rastreio</label><input id="rastreio-salvar" name="rastreio" defaultValue={rastreio} className="campo w-60" /></div>
        <BotaoEnvio pendente={pendenteR} className="btn btn-secondary">Salvar rastreio</BotaoEnvio>
        <div className="w-full"><MensagemEstado estado={estadoR} /></div>
      </form>
      {proximos.length > 0 ? (
        <form key={proximos.map((p) => p.valor).join()} onSubmit={aoEnviar(acao)} className="space-y-3 border-t border-linha pt-5" noValidate>
          <input type="hidden" name="id" value={id} />
          <div><label htmlFor="para" className="mb-1 block text-sm font-medium">Mudar status para</label>
            <select id="para" name="para" className="campo w-64">{proximos.map((p) => <option key={p.valor} value={p.valor}>{p.nome}</option>)}</select></div>
          <div><label htmlFor="nota" className="mb-1 block text-sm font-medium">Observação (opcional)</label><input id="nota" name="nota" maxLength={300} className="campo" /></div>
          <input type="hidden" name="rastreio" value={rastreio} />
          <BotaoEnvio pendente={pendente}>Atualizar status</BotaoEnvio>
          <MensagemEstado estado={estado} />
        </form>
      ) : <p className="border-t border-linha pt-5 text-sm text-marrom-suave">Este pedido está em um status final.</p>}
    </div>
  );
}
