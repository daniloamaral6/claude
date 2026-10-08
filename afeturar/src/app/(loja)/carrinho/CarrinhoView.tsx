"use client";

import Link from "next/link";
import { useState } from "react";
import { FotoPlaceholder } from "@/components/FotoPlaceholder";
import { brl, cores, produtosExemplo } from "@/lib/exemplo";

interface Item { id: string; slug: string; qtd: number; cor: string; personalizacao?: string }

const inicial: Item[] = [
  { id: "a", slug: "exemplo-2", qtd: 1, cor: "preto" },
  { id: "b", slug: "exemplo-3", qtd: 2, cor: "rosa-bebe", personalizacao: "Texto de exemplo" },
];

export function CarrinhoView() {
  const [itens, setItens] = useState(inicial);
  const [cupom, setCupom] = useState("");
  const [erroCupom, setErroCupom] = useState("");

  const linhas = itens.map((i) => {
    const p = produtosExemplo.find((x) => x.slug === i.slug)!;
    return { ...i, p, unit: p.promocional ?? p.preco };
  });
  const subtotal = linhas.reduce((s, l) => s + l.unit * l.qtd, 0);
  const temEncomenda = linhas.some((l) => l.p.disponibilidade === "encomenda");

  const muda = (id: string, d: number) =>
    setItens((s) => s.map((i) => (i.id === id ? { ...i, qtd: Math.max(1, i.qtd + d) } : i)));

  if (!itens.length) {
    return (
      <section className="container-loja py-24 text-center">
        <h1 className="text-3xl font-light tracking-wide">Seu carrinho está vazio</h1>
        <p className="mt-3 text-marrom-suave">Que tal conhecer as novidades?</p>
        <Link href="/" className="btn btn-primary mt-8">Explorar produtos</Link>
      </section>
    );
  }

  return (
    <div className="container-loja py-8 sm:py-12">
      <h1 className="text-3xl font-light tracking-wide sm:text-4xl">Carrinho</h1>
      <div className="mt-8 grid gap-10 lg:grid-cols-[1fr_360px]">
        <ul className="divide-y divide-linha border-y border-linha">
          {linhas.map((l) => (
            <li key={l.id} className="flex gap-4 py-5">
              <FotoPlaceholder legenda="Foto" className="size-24 shrink-0 rounded-lg sm:size-28" />
              <div className="flex flex-1 flex-col">
                <div className="flex justify-between gap-3">
                  <div>
                    <h2 className="font-medium"><Link href={`/produtos/${l.slug}`} className="hover:underline underline-offset-4">{l.p.nome}</Link></h2>
                    <p className="mt-1 text-sm text-marrom-suave">Cor: {cores.find((c) => c.id === l.cor)?.nome}</p>
                    {l.personalizacao && <p className="text-sm text-marrom-suave">Personalização: {l.personalizacao}</p>}
                    <p className="text-xs text-marrom-suave">{l.p.disponibilidade === "pronta" ? "Pronta para envio" : `Sob encomenda · ${l.p.prazoPreparo}`}</p>
                  </div>
                  <p className="font-semibold">{brl(l.unit * l.qtd)}</p>
                </div>
                <div className="mt-auto flex items-center justify-between pt-3">
                  <div role="group" aria-label={`Quantidade de ${l.p.nome}`} className="inline-flex items-center rounded-full border border-marrom">
                    <button type="button" className="size-11 rounded-full hover:bg-creme-profundo disabled:text-marrom-suave" aria-label="Diminuir" disabled={l.qtd <= 1} onClick={() => muda(l.id, -1)}>−</button>
                    <output className="w-8 text-center">{l.qtd}</output>
                    <button type="button" className="size-11 rounded-full hover:bg-creme-profundo" aria-label="Aumentar" onClick={() => muda(l.id, 1)}>+</button>
                  </div>
                  <button type="button" className="min-h-11 px-2 text-sm underline underline-offset-4 hover:text-terracota-escuro" onClick={() => setItens((s) => s.filter((i) => i.id !== l.id))}>
                    Remover<span className="sr-only"> {l.p.nome}</span>
                  </button>
                </div>
              </div>
            </li>
          ))}
        </ul>

        <aside aria-label="Resumo do pedido" className="h-fit rounded-[var(--radius-card)] border border-linha bg-white p-5">
          <h2 className="text-lg font-medium">Resumo</h2>
          <form
            className="mt-4"
            noValidate
            onSubmit={(e) => {
              e.preventDefault();
              setErroCupom(cupom.trim() ? "Cupom não encontrado ou expirado." : "Digite um cupom.");
            }}
          >
            <label htmlFor="cupom" className="text-sm font-medium">Cupom de desconto</label>
            <div className="mt-1 flex gap-2">
              <input id="cupom" value={cupom} onChange={(e) => { setCupom(e.target.value); setErroCupom(""); }} className="campo" aria-invalid={!!erroCupom} aria-describedby="cupom-erro" />
              <button type="submit" className="btn btn-secondary">Aplicar</button>
            </div>
            <p id="cupom-erro" role="alert" className="mt-1 min-h-5 text-sm text-erro">{erroCupom}</p>
          </form>
          <dl className="mt-3 space-y-2 text-sm">
            <div className="flex justify-between"><dt>Subtotal</dt><dd>{brl(subtotal)}</dd></div>
            <div className="flex justify-between"><dt>Frete</dt><dd className="text-marrom-suave">Calculado no checkout</dd></div>
            <div className="flex justify-between border-t border-linha pt-3 text-base font-semibold"><dt>Total</dt><dd>{brl(subtotal)}</dd></div>
          </dl>
          {temEncomenda && <p className="mt-3 rounded-lg bg-cobre/20 p-3 text-xs">Há itens sob encomenda: o prazo total será mostrado antes de você finalizar.</p>}
          <Link href="/checkout" className="btn btn-primary mt-5 w-full">Finalizar compra</Link>
          <Link href="/" className="mt-3 block text-center text-sm underline underline-offset-4">Continuar comprando</Link>
        </aside>
      </div>
    </div>
  );
}
