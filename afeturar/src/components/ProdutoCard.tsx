import Link from "next/link";
import { cores, type ProdutoExemplo } from "@/lib/exemplo";
import { FotoPlaceholder } from "./FotoPlaceholder";
import { Preco } from "./Preco";

export function ProdutoCard({ p }: { p: ProdutoExemplo }) {
  return (
    <article className="group relative">
      <Link href={`/produtos/${p.slug}`} className="block">
        <FotoPlaceholder className="aspect-square w-full rounded-[var(--radius-card)] transition-colors group-hover:bg-linha" />
        <h3 className="mt-3 text-sm font-medium group-hover:underline underline-offset-4">{p.nome}</h3>
        <div className="mt-1"><Preco preco={p.preco} promocional={p.promocional} /></div>
        <p className="mt-1 text-xs text-marrom-suave">
          {p.disponibilidade === "pronta" ? "Pronta para envio" : "Sob encomenda"}
        </p>
      </Link>
      <ul className="mt-2 flex gap-1" aria-label="Cores disponíveis">
        {p.cores.map((id) => {
          const c = cores.find((x) => x.id === id)!;
          return <li key={id} title={c.nome} className="size-4 rounded-full border border-linha" style={{ background: c.css }}><span className="sr-only">{c.nome}</span></li>;
        })}
      </ul>
    </article>
  );
}
