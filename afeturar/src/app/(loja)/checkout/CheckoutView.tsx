"use client";

import Link from "next/link";
import { useState } from "react";
import { brl } from "@/lib/exemplo";

type Pagamento = "pix" | "cartao";

function Campo({ id, label, erro, ...rest }: { id: string; label: string; erro?: string } & React.InputHTMLAttributes<HTMLInputElement>) {
  return (
    <div>
      <label htmlFor={id} className="mb-1 block text-sm font-medium">{label}</label>
      <input id={id} name={id} className="campo" aria-invalid={!!erro} aria-describedby={erro ? `${id}-erro` : undefined} {...rest} />
      {erro && <p id={`${id}-erro`} className="mt-1 text-sm text-erro">{erro}</p>}
    </div>
  );
}

export function CheckoutView() {
  const [pag, setPag] = useState<Pagamento>("pix");
  const [tentou, setTentou] = useState(false);
  const [confirmado, setConfirmado] = useState(false);
  const [email, setEmail] = useState("");
  const [cep, setCep] = useState("");

  const erroEmail = tentou && !/^\S+@\S+\.\S+$/.test(email) ? "Informe um e-mail válido." : undefined;
  const erroCep = tentou && cep.replace(/\D/g, "").length !== 8 ? "Informe um CEP com 8 dígitos." : undefined;

  if (confirmado) {
    return (
      <section className="container-loja max-w-xl py-20 text-center" aria-live="polite">
        <h1 className="text-3xl font-light tracking-wide">Pedido recebido</h1>
        <p className="mt-3 text-marrom-suave">Tela de confirmação: aqui aparecerão o número do pedido, o QR Code do Pix (quando escolhido), o prazo total e o link de acompanhamento.</p>
      </section>
    );
  }

  const passos = ["Seus dados", "Entrega", "Pagamento"];

  return (
    <div className="container-loja py-8 sm:py-12">
      <h1 className="text-3xl font-light tracking-wide sm:text-4xl">Finalizar compra</h1>
      <ol className="mt-4 flex flex-wrap gap-x-6 gap-y-1 text-sm text-marrom-suave" aria-label="Etapas">
        {passos.map((p, i) => <li key={p}><span className="font-semibold text-marrom">{i + 1}.</span> {p}</li>)}
      </ol>

      <form
        noValidate
        className="mt-8 grid gap-10 lg:grid-cols-[1fr_360px]"
        onSubmit={(e) => {
          e.preventDefault();
          setTentou(true);
          if (/^\S+@\S+\.\S+$/.test(email) && cep.replace(/\D/g, "").length === 8) setConfirmado(true);
        }}
      >
        <div className="space-y-10">
          <fieldset className="space-y-4">
            <legend className="text-lg font-medium">1. Seus dados</legend>
            <p className="text-sm text-marrom-suave">Você pode comprar sem criar conta. <Link href="/conta" className="underline underline-offset-4">Já tenho conta</Link></p>
            <Campo id="email" label="E-mail" type="email" autoComplete="email" required value={email} onChange={(e) => setEmail(e.target.value)} erro={erroEmail} />
            <div className="grid gap-4 sm:grid-cols-2">
              <Campo id="nome" label="Nome completo" autoComplete="name" required />
              <Campo id="telefone" label="Telefone / WhatsApp" type="tel" autoComplete="tel" />
            </div>
          </fieldset>

          <fieldset className="space-y-4">
            <legend className="text-lg font-medium">2. Entrega</legend>
            <div className="grid gap-4 sm:grid-cols-3">
              <Campo id="cep" label="CEP" inputMode="numeric" autoComplete="postal-code" placeholder="00000-000" value={cep} onChange={(e) => setCep(e.target.value)} erro={erroCep} />
            </div>
            <Campo id="rua" label="Endereço" autoComplete="address-line1" />
            <div className="grid gap-4 sm:grid-cols-3">
              <Campo id="numero" label="Número" />
              <Campo id="complemento" label="Complemento" />
              <Campo id="bairro" label="Bairro" />
            </div>
            <div className="grid gap-4 sm:grid-cols-2">
              <Campo id="cidade" label="Cidade" />
              <Campo id="uf" label="Estado" maxLength={2} />
            </div>
            <div className="rounded-[var(--radius-card)] border border-dashed border-linha p-4 text-sm text-marrom-suave">
              As modalidades de frete (com valor e prazo) aparecerão aqui após o CEP, vindas do Melhor Envio. O prazo estimado total soma o preparo e a entrega.
            </div>
          </fieldset>

          <fieldset className="space-y-3">
            <legend className="text-lg font-medium">3. Pagamento</legend>
            {([["pix", "Pix", "Aprovação em instantes. O QR Code aparece na confirmação."], ["cartao", "Cartão de crédito", "Pago com segurança pelo Mercado Pago."]] as const).map(([v, t, d]) => (
              <label key={v} className={`flex cursor-pointer gap-3 rounded-[var(--radius-card)] border p-4 ${pag === v ? "border-terracota-escuro bg-white" : "border-linha"}`}>
                <input type="radio" name="pagamento" value={v} checked={pag === v} onChange={() => setPag(v)} className="mt-1 size-5 accent-terracota-escuro" />
                <span><span className="block font-medium">{t}</span><span className="text-sm text-marrom-suave">{d}</span></span>
              </label>
            ))}
            {pag === "cartao" && (
              <div className="rounded-[var(--radius-card)] border border-dashed border-linha p-4 text-sm text-marrom-suave">
                Os dados do cartão serão digitados em campos seguros fornecidos pelo Mercado Pago. A Afeturar não recebe nem armazena número, validade ou código do cartão.
              </div>
            )}
          </fieldset>
        </div>

        <aside aria-label="Resumo do pedido" className="h-fit rounded-[var(--radius-card)] border border-linha bg-white p-5">
          <h2 className="text-lg font-medium">Resumo</h2>
          <dl className="mt-4 space-y-2 text-sm">
            <div className="flex justify-between"><dt>Itens (exemplo)</dt><dd>{brl(164)}</dd></div>
            <div className="flex justify-between"><dt>Frete</dt><dd className="text-marrom-suave">Após informar o CEP</dd></div>
            <div className="flex justify-between"><dt>Desconto</dt><dd>—</dd></div>
            <div className="flex justify-between border-t border-linha pt-3 text-base font-semibold"><dt>Total</dt><dd>{brl(164)}</dd></div>
          </dl>
          <p className="mt-3 text-xs text-marrom-suave">Valores finais são recalculados e validados no servidor.</p>
          <label className="mt-4 flex items-start gap-3 text-sm">
            <input type="checkbox" required className="mt-1 size-5 accent-terracota-escuro" />
            <span>Li e concordo com os termos de uso, a política de privacidade e a política de trocas.</span>
          </label>
          <button type="submit" className="btn btn-primary mt-5 w-full">{pag === "pix" ? "Pagar com Pix" : "Pagar com cartão"}</button>
        </aside>
      </form>
    </div>
  );
}
