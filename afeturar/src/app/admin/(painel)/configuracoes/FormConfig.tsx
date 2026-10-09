"use client";

import { useActionState } from "react";
import { aoEnviar, BotaoEnvio, Campo, MensagemEstado, propsCampo, Secao, type Estado } from "@/components/admin/Ui";
import { salvarConfig } from "./actions";

export function FormConfig({ valores }: { valores: Record<string, string> }) {
  const [estado, acao, pendente] = useActionState<Estado, FormData>(salvarConfig, {});
  const f = (chave: string, label: string, opts: { dica?: string; placeholder?: string; tipo?: string } = {}) => (
    <Campo id={chave} label={label} erro={estado.erros?.[chave]} dica={opts.dica}>
      <input {...propsCampo(chave, estado.erros?.[chave], opts.dica)} type={opts.tipo ?? "text"} defaultValue={valores[chave] ?? ""} placeholder={opts.placeholder} className="campo" />
    </Campo>
  );
  return (
    <form onSubmit={aoEnviar(acao)} className="max-w-3xl space-y-6" noValidate>
      <Secao id="s-contato" titulo="Contato e atendimento">
        {f("contato.whatsapp", "WhatsApp", { dica: "Só números, com 55 + DDD + número. Ex.: 5511999999999. O botão flutuante só aparece quando isto estiver preenchido.", placeholder: "5511999999999" })}
        {f("contato.email", "E-mail de atendimento", { tipo: "email" })}
      </Secao>
      <Secao id="s-empresa" titulo="Dados da empresa (rodapé e políticas)">
        {f("empresa.cnpj", "CNPJ", { dica: "Só números (14 dígitos). Deixe vazio se ainda não houver." })}
        {f("empresa.endereco", "Endereço")}
      </Secao>
      <Secao id="s-redes" titulo="Redes sociais">
        {f("redes.instagram", "Instagram", { placeholder: "https://www.instagram.com/afeturar" })}
        {f("redes.facebook", "Facebook")}
        {f("redes.tiktok", "TikTok")}
        {f("redes.pinterest", "Pinterest")}
        {f("redes.youtube", "YouTube")}
      </Secao>
      <Secao id="s-frete" titulo="Frete">
        {f("frete.cepOrigem", "CEP de origem", { dica: "De onde os pedidos saem. Usado no cálculo de frete.", placeholder: "00000000" })}
        {f("frete.gratisAPartirDeCentavos", "Frete grátis a partir de (R$)", { dica: "Deixe vazio para não oferecer frete grátis. Ex.: 299,00", placeholder: "299,00" })}
      </Secao>
      <MensagemEstado estado={estado} />
      <BotaoEnvio pendente={pendente}>Salvar configurações</BotaoEnvio>
    </form>
  );
}
