"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { ProdutoCard } from "@/components/ProdutoCard";
import { cores, produtosExemplo, type Disponibilidade } from "@/lib/exemplo";

type Ordem = "novidades" | "menor" | "maior";

export function CatalogoView({ categoriaSlug, categoriaNome }: { categoriaSlug: string; categoriaNome: string }) {
  const [ordem, setOrdem] = useState<Ordem>("novidades");
  const [corSel, setCorSel] = useState<string[]>([]);
  const [disp, setDisp] = useState<Disponibilidade | "todas">("todas");
  const [soPromo, setSoPromo] = useState(false);

  const lista = useMemo(() => {
    let l = produtosExemplo.filter((p) => p.categoria === categoriaSlug);
    if (corSel.length) l = l.filter((p) => p.cores.some((c) => corSel.includes(c)));
    if (disp !== "todas") l = l.filter((p) => p.disponibilidade === disp);
    if (soPromo) l = l.filter((p) => p.promocional);
    const preco = (p: (typeof l)[number]) => p.promocional ?? p.preco;
    if (ordem === "menor") l = [...l].sort((a, b) => preco(a) - preco(b));
    if (ordem === "maior") l = [...l].sort((a, b) => preco(b) - preco(a));
    return l;
  }, [categoriaSlug, corSel, disp, soPromo, ordem]);

  const limpar = () => { setCorSel([]); setDisp("todas"); setSoPromo(false); };
  const filtrosAtivos = corSel.length + (disp !== "todas" ? 1 : 0) + (soPromo ? 1 : 0);

  const filtros = (px: string) => (
    <div className="space-y-6">
      <fieldset>
        <legend className="mb-2 text-sm font-semibold">Disponibilidade</legend>
        {([["todas", "Todas"], ["pronta", "Pronta para envio"], ["encomenda", "Sob encomenda"]] as const).map(([v, l]) => (
          <label key={v} className="flex min-h-9 items-center gap-2 text-sm">
            <input type="radio" name={`disp-${px}`} checked={disp === v} onChange={() => setDisp(v)} className="size-4 accent-terracota-escuro" />
            {l}
          </label>
        ))}
      </fieldset>
      <fieldset>
        <legend className="mb-2 text-sm font-semibold">Cor</legend>
        <div className="space-y-1">
          {cores.map((c) => (
            <label key={c.id} className="flex min-h-9 items-center gap-2 text-sm">
              <input
                type="checkbox"
                checked={corSel.includes(c.id)}
                onChange={() => setCorSel((s) => (s.includes(c.id) ? s.filter((x) => x !== c.id) : [...s, c.id]))}
                className="size-4 accent-terracota-escuro"
              />
              <span className="size-4 rounded-full border border-linha" style={{ background: c.css }} aria-hidden />
              {c.nome}
            </label>
          ))}
        </div>
      </fieldset>
      <label className="flex min-h-9 items-center gap-2 text-sm font-medium">
        <input type="checkbox" checked={soPromo} onChange={(e) => setSoPromo(e.target.checked)} className="size-4 accent-terracota-escuro" />
        Somente em promoção
      </label>
      {filtrosAtivos > 0 && <button type="button" onClick={limpar} className="btn btn-secondary w-full">Limpar filtros</button>}
    </div>
  );

  return (
    <div className="container-loja py-8 sm:py-12">
      <nav aria-label="Você está em" className="text-sm text-marrom-suave">
        <Link href="/" className="underline-offset-4 hover:underline">Início</Link> <span aria-hidden>/</span> <span aria-current="page">{categoriaNome}</span>
      </nav>
      <h1 className="mt-3 text-3xl font-light tracking-wide sm:text-4xl">{categoriaNome}</h1>

      <div className="mt-8 grid gap-8 lg:grid-cols-[220px_1fr]">
        <aside aria-label="Filtros" className="hidden lg:block">{filtros("d")}</aside>

        <section aria-label="Produtos">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <details className="lg:hidden">
              <summary className="btn btn-secondary cursor-pointer list-none">
                Filtros{filtrosAtivos > 0 && ` (${filtrosAtivos})`}
              </summary>
              <div className="mt-3 rounded-[var(--radius-card)] border border-linha bg-white p-4">{filtros("m")}</div>
            </details>
            <p className="text-sm text-marrom-suave" aria-live="polite">{lista.length} {lista.length === 1 ? "produto" : "produtos"}</p>
            <div className="flex items-center gap-2">
              <label htmlFor="ordem" className="text-sm">Ordenar por</label>
              <select id="ordem" value={ordem} onChange={(e) => setOrdem(e.target.value as Ordem)} className="campo w-auto">
                <option value="novidades">Novidades</option>
                <option value="menor">Menor preço</option>
                <option value="maior">Maior preço</option>
              </select>
            </div>
          </div>

          {lista.length === 0 ? (
            <div className="mt-8 rounded-[var(--radius-card)] border border-dashed border-linha px-6 py-14 text-center">
              <p className="font-medium">Nenhum produto encontrado</p>
              <p className="mt-1 text-sm text-marrom-suave">Tente remover alguns filtros ou escolher outra categoria.</p>
              {filtrosAtivos > 0 && <button type="button" onClick={limpar} className="btn btn-primary mt-5">Limpar filtros</button>}
            </div>
          ) : (
            <ul className="mt-6 grid grid-cols-2 gap-x-4 gap-y-8 md:grid-cols-3">
              {lista.map((p) => <li key={p.slug}><ProdutoCard p={p} /></li>)}
            </ul>
          )}
        </section>
      </div>
    </div>
  );
}
