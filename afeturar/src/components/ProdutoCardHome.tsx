import Link from "next/link";
import type { ProdutoExemplo } from "@/lib/exemplo";
import { FotoPlaceholder } from "./FotoPlaceholder";
import { Icone } from "./Icones";
import { Preco } from "./Preco";

/** Cartão compacto da home: foto, nome, preço e atalho para a página do produto (variações são escolhidas lá). */
export function ProdutoCardHome({ p }: { p: ProdutoExemplo }) {
  return (
    <li className="w-[60%] shrink-0 snap-start sm:w-[34%] md:w-[24%] lg:w-[19%]">
      <article className="h-full rounded-[var(--radius-card)] border border-linha bg-white p-2">
        <Link href={`/produtos/${p.slug}`} className="block">
          <FotoPlaceholder className="aspect-[4/3] w-full rounded-lg" />
          <h3 className="mt-3 px-1 text-sm font-medium">{p.nome}</h3>
        </Link>
        <div className="mt-2 flex items-end justify-between gap-2 px-1 pb-1">
          <Preco preco={p.preco} promocional={p.promocional} />
          <Link href={`/produtos/${p.slug}`} aria-label={`Ver ${p.nome}`} className="inline-flex size-11 shrink-0 items-center justify-center rounded-lg bg-terracota-escuro text-creme hover:bg-acao-hover">
            <Icone nome="sacola" tamanho={20} />
          </Link>
        </div>
      </article>
    </li>
  );
}
