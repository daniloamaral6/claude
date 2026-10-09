"use client";

import { useActionState, useEffect, useRef } from "react";
import { aoEnviar, BotaoEnvio, Campo, MensagemEstado, propsCampo, type Estado } from "@/components/admin/Ui";
import { removerCategoria, salvarCategoria } from "./actions";

export interface CategoriaLinha { id: string; nome: string; descricao: string | null; paiId: string | null; ordem: number; ativa: boolean; produtos: number; filhas: number }

export function FormCategoria({ cat, principais }: { cat?: CategoriaLinha; principais: { id: string; nome: string }[] }) {
  const [estado, acao, pendente] = useActionState<Estado, FormData>(salvarCategoria, {});
  const formRef = useRef<HTMLFormElement>(null);
  useEffect(() => { if (estado.ok && !cat) formRef.current?.reset(); }, [estado, cat]);
  const [estadoDel, acaoDel, pendenteDel] = useActionState<Estado, FormData>(removerCategoria, {});
  const p = (k: string) => propsCampo(`${cat?.id ?? "nova"}-${k}`, estado.erros?.[k]);
  return (
    <div className="space-y-3">
      <form ref={formRef} onSubmit={aoEnviar(acao)} className="grid gap-3 sm:grid-cols-2" noValidate>
        {cat && <input type="hidden" name="id" value={cat.id} />}
        <Campo id={`${cat?.id ?? "nova"}-nome`} label="Nome" erro={estado.erros?.nome}><input {...p("nome")} name="nome" defaultValue={cat?.nome} required className="campo" /></Campo>
        <Campo id={`${cat?.id ?? "nova"}-paiId`} label="Subcategoria de" dica="Opcional. Só um nível."><select {...p("paiId")} name="paiId" defaultValue={cat?.paiId ?? ""} className="campo"><option value="">— Categoria principal —</option>{principais.filter((x) => x.id !== cat?.id).map((x) => <option key={x.id} value={x.id}>{x.nome}</option>)}</select></Campo>
        <Campo id={`${cat?.id ?? "nova"}-descricao`} label="Descrição" erro={estado.erros?.descricao}><input {...p("descricao")} name="descricao" defaultValue={cat?.descricao ?? ""} className="campo" /></Campo>
        <Campo id={`${cat?.id ?? "nova"}-ordem`} label="Ordem no menu" dica="Menor aparece primeiro."><input {...p("ordem")} name="ordem" type="number" min={0} defaultValue={cat?.ordem ?? 0} className="campo" /></Campo>
        <label className="flex min-h-11 items-center gap-2 text-sm"><input type="checkbox" name="ativa" defaultChecked={cat?.ativa ?? true} className="size-5 accent-terracota-escuro" /> Categoria visível na loja</label>
        <div className="flex items-center gap-3 sm:col-span-2"><BotaoEnvio pendente={pendente}>{cat ? "Salvar" : "Criar categoria"}</BotaoEnvio></div>
      </form>
      <MensagemEstado estado={estado} />
      {cat && (
        <form onSubmit={aoEnviar(acaoDel)} className="border-t border-linha pt-3">
          <input type="hidden" name="id" value={cat.id} />
          <BotaoEnvio pendente={pendenteDel} className="btn btn-secondary" pendenteTexto="Excluindo…">Excluir categoria</BotaoEnvio>
          <span className="ml-3 text-xs text-marrom-suave">{cat.produtos} produto(s) · {cat.filhas} subcategoria(s)</span>
          <div className="mt-2"><MensagemEstado estado={estadoDel} /></div>
        </form>
      )}
    </div>
  );
}
