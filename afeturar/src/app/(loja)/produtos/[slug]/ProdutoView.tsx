"use client";

import Link from "next/link";
import { useState } from "react";
import { FotoPlaceholder } from "@/components/FotoPlaceholder";
import { Preco } from "@/components/Preco";
import { ProdutoCard } from "@/components/ProdutoCard";
import { cores, type ProdutoExemplo } from "@/lib/exemplo";
import { site } from "@/lib/site";

export function ProdutoView({ p, relacionados }: { p: ProdutoExemplo; relacionados: ProdutoExemplo[] }) {
  const [cor, setCor] = useState(p.cores[0]);
  const [qtd, setQtd] = useState(1);
  const [foto, setFoto] = useState(0);
  const [cep, setCep] = useState("");
  const [adicionado, setAdicionado] = useState(false);
  const corAtual = cores.find((c) => c.id === cor)!;

  return (
    <div className="container-loja py-8 sm:py-12">
      <nav aria-label="Você está em" className="text-sm text-marrom-suave">
        <Link href="/" className="underline-offset-4 hover:underline">Início</Link> <span aria-hidden>/</span> <span aria-current="page">{p.nome}</span>
      </nav>

      <div className="mt-6 grid gap-10 lg:grid-cols-2">
        {/* Galeria */}
        <div>
          <FotoPlaceholder legenda={`Foto principal ${foto + 1}`} className="aspect-square w-full rounded-[var(--radius-card)]" />
          <ul className="mt-3 flex gap-2" aria-label="Galeria de fotos">
            {[0, 1, 2, 3].map((i) => (
              <li key={i}>
                <button
                  type="button"
                  onClick={() => setFoto(i)}
                  aria-label={`Ver foto ${i + 1}`}
                  aria-current={foto === i}
                  className={`size-16 rounded-lg border-2 bg-creme-profundo ${foto === i ? "border-terracota-escuro" : "border-transparent"}`}
                />
              </li>
            ))}
          </ul>
        </div>

        {/* Compra */}
        <div>
          <h1 className="text-3xl font-light tracking-wide">{p.nome}</h1>
          <div className="mt-3"><Preco preco={p.preco} promocional={p.promocional} grande /></div>
          <p className="mt-1 text-xs text-marrom-suave">Pix e cartão no checkout. Parcelamento conforme configuração de pagamento.</p>

          <p className="mt-5 text-sm">
            <span className={`inline-block rounded-full px-3 py-1 text-xs font-medium ${p.disponibilidade === "pronta" ? "bg-creme-profundo" : "bg-cobre/25"}`}>
              {p.disponibilidade === "pronta" ? "Pronta para envio" : "Sob encomenda"}
            </span>
            <span className="ml-2 text-marrom-suave">{p.prazoPreparo}</span>
          </p>

          <fieldset className="mt-6">
            <legend className="text-sm font-semibold">Cor: <span className="font-normal">{corAtual.nome}</span></legend>
            <div className="mt-2 flex flex-wrap gap-2">
              {p.cores.map((id) => {
                const c = cores.find((x) => x.id === id)!;
                return (
                  <label key={id} className="relative">
                    <input type="radio" name="cor" value={id} checked={cor === id} onChange={() => setCor(id)} className="peer sr-only" />
                    <span
                      className="block size-11 cursor-pointer rounded-full border border-linha ring-offset-2 ring-offset-creme peer-checked:ring-2 peer-checked:ring-terracota-escuro peer-focus-visible:outline peer-focus-visible:outline-[3px] peer-focus-visible:outline-terracota-escuro"
                      style={{ background: c.css }}
                      title={c.nome}
                    />
                    <span className="sr-only">{c.nome}</span>
                  </label>
                );
              })}
            </div>
          </fieldset>

          <div className="mt-6">
            <label htmlFor="tamanho" className="block text-sm font-semibold">Tamanho</label>
            <select id="tamanho" className="campo mt-2 max-w-xs" defaultValue="">
              <option value="" disabled>Selecione</option>
              <option>Tamanho de exemplo A</option>
              <option>Tamanho de exemplo B</option>
            </select>
          </div>

          {p.personalizavel && (
            <div className="mt-6">
              <label htmlFor="personalizacao" className="block text-sm font-semibold">Personalização</label>
              <input id="personalizacao" className="campo mt-2" placeholder="Ex.: nome ou texto desejado" aria-describedby="pers-ajuda" />
              <p id="pers-ajuda" className="mt-1 text-xs text-marrom-suave">Confira a grafia com atenção: peças personalizadas podem não ter troca.</p>
            </div>
          )}

          <div className="mt-6">
            <p id="qtd-l" className="text-sm font-semibold">Quantidade</p>
            <div role="group" aria-labelledby="qtd-l" className="mt-2 inline-flex items-center rounded-full border border-marrom">
              <button type="button" className="size-11 rounded-full text-lg hover:bg-creme-profundo disabled:text-marrom-suave" aria-label="Diminuir quantidade" disabled={qtd <= 1} onClick={() => setQtd(qtd - 1)}>−</button>
              <output className="w-10 text-center" aria-live="polite">{qtd}</output>
              <button type="button" className="size-11 rounded-full text-lg hover:bg-creme-profundo" aria-label="Aumentar quantidade" onClick={() => setQtd(qtd + 1)}>+</button>
            </div>
          </div>

          <div className="mt-6 flex flex-col gap-3 sm:flex-row">
            <Link href="/checkout" className="btn btn-primary flex-1">Comprar agora</Link>
            <button type="button" className="btn btn-secondary flex-1" onClick={() => setAdicionado(true)}>Adicionar ao carrinho</button>
          </div>
          <p role="status" className="mt-2 min-h-5 text-sm text-terracota-escuro">
            {adicionado && <>Adicionado ao carrinho. <Link href="/carrinho" className="underline underline-offset-4">Ver carrinho</Link></>}
          </p>

          <form className="mt-6 rounded-[var(--radius-card)] border border-linha p-4" onSubmit={(e) => e.preventDefault()}>
            <label htmlFor="cep" className="block text-sm font-semibold">Calcular frete e prazo</label>
            <div className="mt-2 flex gap-2">
              <input id="cep" inputMode="numeric" autoComplete="postal-code" maxLength={9} placeholder="00000-000" value={cep} onChange={(e) => setCep(e.target.value)} className="campo" />
              <button type="submit" className="btn btn-secondary" disabled={cep.replace(/\D/g, "").length !== 8}>Calcular</button>
            </div>
            <p className="mt-2 text-xs text-marrom-suave">O prazo total soma o preparo ({p.prazoPreparo.toLowerCase()}) e o envio. O cálculo real usará o Melhor Envio.</p>
          </form>

          <div className="mt-4 flex flex-wrap gap-3 text-sm">
            {site.whatsapp ? (
              <a className="underline underline-offset-4" href={`https://wa.me/${site.whatsapp}`}>Tirar dúvidas pelo WhatsApp</a>
            ) : (
              <span className="text-marrom-suave">Atendimento por WhatsApp: número a configurar no painel.</span>
            )}
            <button type="button" className="underline underline-offset-4" onClick={() => navigator.share?.({ title: p.nome, url: location.href }).catch(() => {})}>Compartilhar</button>
            <button type="button" className="underline underline-offset-4" aria-pressed="false">Favoritar</button>
          </div>
        </div>
      </div>

      <section className="mt-14 grid gap-8 border-t border-linha pt-10 md:grid-cols-3" aria-label="Detalhes do produto">
        <div><h2 className="font-semibold">Descrição</h2><p className="mt-2 text-sm text-marrom-suave">Texto comercial do produto, cadastrado no painel.</p></div>
        <div><h2 className="font-semibold">Características e benefícios</h2><ul className="mt-2 list-disc pl-5 text-sm text-marrom-suave"><li>Item cadastrado no painel</li><li>Item cadastrado no painel</li></ul></div>
        <div><h2 className="font-semibold">Dimensões e material</h2><p className="mt-2 text-sm text-marrom-suave">Medidas, material e cuidados informados pelo cadastro — nunca estimados.</p></div>
      </section>

      <section className="mt-14" aria-labelledby="rel-t">
        <h2 id="rel-t" className="text-2xl font-light tracking-wide">Produtos relacionados</h2>
        <ul className="mt-6 grid grid-cols-2 gap-x-4 gap-y-8 md:grid-cols-4">
          {relacionados.map((r) => <li key={r.slug}><ProdutoCard p={r} /></li>)}
        </ul>
      </section>
    </div>
  );
}
