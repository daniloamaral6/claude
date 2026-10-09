"use client";

import { useActionState, useEffect, useRef, useState } from "react";
import { aoEnviar, BotaoEnvio, Campo, MensagemEstado, propsCampo, type Estado } from "@/components/admin/Ui";
import { excluirCupomAcao, salvarCupomAcao } from "./actions";

export interface CupomLinha { id: string; codigo: string; tipo: "PERCENTUAL" | "VALOR_FIXO" | "FRETE_GRATIS"; valor: string; minimo: string; usoMaximo: string; inicio: string; fim: string; ativo: boolean; usos: number }

export function FormCupom({ cupom }: { cupom?: CupomLinha }) {
  const [estado, acao, pendente] = useActionState<Estado, FormData>(salvarCupomAcao, {});
  const [estadoDel, acaoDel, pendenteDel] = useActionState<Estado, FormData>(excluirCupomAcao, {});
  const [tipo, setTipo] = useState(cupom?.tipo ?? "PERCENTUAL");
  const ref = useRef<HTMLFormElement>(null);
  useEffect(() => { if (estado.ok && !cupom) ref.current?.reset(); }, [estado, cupom]);
  const k = cupom?.id ?? "novo"; const e = estado.erros ?? {};
  return (
    <div className="space-y-3">
      <form ref={ref} onSubmit={aoEnviar(acao)} noValidate className="grid gap-3 sm:grid-cols-3">
        {cupom && <input type="hidden" name="id" value={cupom.id} />}
        <Campo id={`${k}-codigo`} label="Código" erro={e.codigo} dica="O cliente digita este código."><input {...propsCampo(`${k}-codigo`, e.codigo, "d")} name="codigo" defaultValue={cupom?.codigo} className="campo uppercase" autoComplete="off" /></Campo>
        <Campo id={`${k}-tipo`} label="Tipo"><select id={`${k}-tipo`} name="tipo" value={tipo} onChange={(ev) => setTipo(ev.target.value as typeof tipo)} className="campo"><option value="PERCENTUAL">Percentual (%)</option><option value="VALOR_FIXO">Valor fixo (R$)</option><option value="FRETE_GRATIS">Frete grátis</option></select></Campo>
        {tipo !== "FRETE_GRATIS" ? <Campo id={`${k}-valor`} label={tipo === "PERCENTUAL" ? "Desconto (%)" : "Desconto (R$)"} erro={e.valor}><input {...propsCampo(`${k}-valor`, e.valor)} name="valor" inputMode="decimal" defaultValue={cupom?.valor} className="campo" /></Campo> : <div />}
        <Campo id={`${k}-minimo`} label="Compra mínima (R$)" dica="Vazio = sem mínimo." erro={e.minimoCentavos}><input {...propsCampo(`${k}-minimo`, e.minimoCentavos, "d")} name="minimo" inputMode="decimal" defaultValue={cupom?.minimo} className="campo" /></Campo>
        <Campo id={`${k}-uso`} label="Limite de usos" dica="Vazio = ilimitado." erro={e.usoMaximo}><input {...propsCampo(`${k}-uso`, e.usoMaximo, "d")} name="usoMaximo" inputMode="numeric" defaultValue={cupom?.usoMaximo} className="campo" /></Campo>
        <div />
        <Campo id={`${k}-inicio`} label="Válido a partir de" erro={e.inicioEm}><input {...propsCampo(`${k}-inicio`, e.inicioEm)} name="inicio" type="date" defaultValue={cupom?.inicio} className="campo" /></Campo>
        <Campo id={`${k}-fim`} label="Válido até (inclusive)" erro={e.fimEm}><input {...propsCampo(`${k}-fim`, e.fimEm)} name="fim" type="date" defaultValue={cupom?.fim} className="campo" /></Campo>
        <label className="flex min-h-11 items-center gap-2 self-end text-sm"><input type="checkbox" name="ativo" defaultChecked={cupom?.ativo ?? true} className="size-5 accent-terracota-escuro" /> Cupom ativo</label>
        <div className="sm:col-span-3"><BotaoEnvio pendente={pendente}>{cupom ? "Salvar" : "Criar cupom"}</BotaoEnvio></div>
      </form>
      <MensagemEstado estado={estado} />
      {cupom && (
        <form onSubmit={aoEnviar(acaoDel)} className="border-t border-linha pt-3">
          <input type="hidden" name="id" value={cupom.id} />
          <BotaoEnvio pendente={pendenteDel} pendenteTexto="Excluindo…" className="btn btn-secondary">Excluir cupom</BotaoEnvio>
          <span className="ml-3 text-xs text-marrom-suave">Usado {cupom.usos}×. Se já foi usado em pedido, apenas é desativado.</span>
          <div className="mt-2"><MensagemEstado estado={estadoDel} /></div>
        </form>
      )}
    </div>
  );
}
