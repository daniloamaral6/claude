import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { formatarBRL } from "@/lib/moeda";
import { textoPrazo } from "@/lib/preco";
import { lerCarrinho } from "@/server/carrinho";
import { tokenDoCarrinho } from "@/server/carrinho-cookie";
import { mudarQuantidade, removerDoCarrinho, ajustarItens } from "./actions";

export const metadata: Metadata = { title: "Carrinho", robots: { index: false, follow: false } };
export const dynamic = "force-dynamic";

export default async function Carrinho({ searchParams }: { searchParams: Promise<{ erro?: string }> }) {
  const { erro } = await searchParams;
  const c = await lerCarrinho(await tokenDoCarrinho());

  if (c.linhas.length === 0) {
    return (
      <section className="container-loja py-24 text-center">
        <h1 className="text-3xl tracking-wide">Seu carrinho está vazio</h1>
        {erro && <p role="alert" className="mx-auto mt-4 max-w-md text-sm text-erro">{erro}</p>}
        <p className="mt-3 text-marrom-suave">Que tal conhecer as novidades?</p>
        <Link href="/loja" className="btn btn-primary mt-8">Explorar produtos</Link>
      </section>
    );
  }

  return (
    <div className="container-loja py-8 sm:py-12">
      <h1 className="text-3xl tracking-wide sm:text-4xl">Carrinho</h1>
      {erro && <p role="alert" className="mt-4 rounded-lg border border-erro bg-white px-4 py-3 text-sm text-erro">{erro}</p>}
      {c.temProblemas && (
        <form action={ajustarItens} className="mt-4 flex flex-wrap items-center gap-3 rounded-lg border border-terracota-escuro bg-white px-4 py-3 text-sm">
          <p className="flex-1">Alguns itens mudaram de disponibilidade desde que você os adicionou.</p>
          <button type="submit" className="btn btn-secondary">Ajustar carrinho</button>
        </form>
      )}
      <div className="mt-8 grid gap-10 lg:grid-cols-[1fr_360px]">
        <ul className="divide-y divide-linha border-y border-linha">
          {c.linhas.map((l) => (
            <li key={l.itemId} className="flex gap-4 py-5">
              <Link href={`/produtos/${l.produto.slug}`} className="relative block size-24 shrink-0 overflow-hidden rounded-lg bg-creme-profundo sm:size-28">
                {l.produto.imagemUrl ? <Image src={l.produto.imagemUrl} alt={l.produto.imagemAlt} fill sizes="112px" className="object-cover" /> : <Image src="/brand/simbolo-transparente.webp" alt="" aria-hidden fill sizes="112px" className="object-contain p-[20%] opacity-25" />}
              </Link>
              <div className="flex flex-1 flex-col">
                <div className="flex justify-between gap-3">
                  <div>
                    <h2 className="font-sans text-base font-medium"><Link href={`/produtos/${l.produto.slug}`} className="underline-offset-4 hover:underline">{l.produto.nome}</Link></h2>
                    {(l.variacao.cor || l.variacao.tamanho) && <p className="mt-1 text-sm text-marrom-suave">{[l.variacao.cor && `Cor: ${l.variacao.cor}`, l.variacao.tamanho && `Tamanho: ${l.variacao.tamanho}`].filter(Boolean).join(" · ")}</p>}
                    {l.personalizacao.map((p) => <p key={p.rotulo} className="text-sm text-marrom-suave">{p.rotulo}: <span className="text-marrom">{p.texto}</span></p>)}
                    <p className="text-xs text-marrom-suave">{textoPrazo(l.produto.tipo, l.prazoDias)}</p>
                    {l.problema && <p role="alert" className="mt-1 text-sm font-medium text-erro">{l.problema}</p>}
                  </div>
                  <div className="text-right">
                    <p className={`font-semibold ${l.problema ? "text-marrom-suave line-through" : ""}`}>{formatarBRL(l.precoUnitarioCentavos * l.quantidade)}</p>
                    {l.quantidade > 1 && <p className="text-xs text-marrom-suave">{formatarBRL(l.precoUnitarioCentavos)} cada</p>}
                    {l.precoOriginalCentavos && <p className="text-xs text-marrom-suave"><s>{formatarBRL(l.precoOriginalCentavos)}</s></p>}
                  </div>
                </div>
                <div className="mt-auto flex items-center justify-between pt-3">
                  <form action={mudarQuantidade} className="inline-flex items-center rounded-full border border-marrom" aria-label={`Quantidade de ${l.produto.nome}`}>
                    <input type="hidden" name="itemId" value={l.itemId} /><input type="hidden" name="atual" value={l.quantidade} />
                    <button type="submit" name="acao" value="menos" className="size-11 rounded-full hover:bg-creme-profundo" aria-label={l.quantidade === 1 ? "Remover item" : "Diminuir quantidade"}>−</button>
                    <output className="w-8 text-center">{l.quantidade}</output>
                    <button type="submit" name="acao" value="mais" disabled={l.quantidade >= l.quantidadeMaxima} className="size-11 rounded-full hover:bg-creme-profundo disabled:text-marrom-suave" aria-label="Aumentar quantidade">+</button>
                  </form>
                  <form action={removerDoCarrinho}>
                    <input type="hidden" name="itemId" value={l.itemId} />
                    <button type="submit" className="min-h-11 px-2 text-sm underline underline-offset-4 hover:text-terracota-escuro">Remover<span className="sr-only"> {l.produto.nome}</span></button>
                  </form>
                </div>
              </div>
            </li>
          ))}
        </ul>

        <aside aria-label="Resumo do pedido" className="h-fit rounded-[var(--radius-card)] border border-linha bg-white p-5">
          <h2 className="text-xl">Resumo</h2>
          <dl className="mt-4 space-y-2 text-sm">
            <div className="flex justify-between"><dt>Subtotal ({c.quantidadeTotal} {c.quantidadeTotal === 1 ? "item" : "itens"})</dt><dd>{formatarBRL(c.subtotalCentavos)}</dd></div>
            <div className="flex justify-between"><dt>Frete</dt><dd className="text-marrom-suave">Calculado no checkout</dd></div>
            <div className="flex justify-between border-t border-linha pt-3 text-base font-semibold"><dt>Total parcial</dt><dd>{formatarBRL(c.subtotalCentavos)}</dd></div>
          </dl>
          {c.temSobEncomenda && <p className="mt-3 rounded-lg bg-cobre/20 p-3 text-xs">Há itens sob encomenda. {c.prazoPreparoDias > 0 ? `O preparo leva até ${c.prazoPreparoDias} dias úteis, somados ao envio.` : "O prazo será informado antes de você finalizar."}</p>}
          {c.temProblemas
            ? <p className="mt-5 text-sm text-marrom-suave">Ajuste os itens indisponíveis para continuar.</p>
            : <Link href="/checkout" className="btn btn-primary mt-5 w-full">Finalizar compra</Link>}
          <Link href="/loja" className="mt-3 block text-center text-sm underline underline-offset-4">Continuar comprando</Link>
        </aside>
      </div>
    </div>
  );
}
