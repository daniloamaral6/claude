import Link from "next/link";
import type { CartaoProduto } from "@/server/catalogo";
import { BotaoFavorito } from "./BotaoFavorito";
import { FotoProduto } from "./FotoProduto";
import { Preco } from "./Preco";

export function ProdutoCard({ p, prioridade = false }: { p: CartaoProduto; prioridade?: boolean }) {
  return (
    <article className="group relative">
      <Link href={`/produtos/${p.slug}`} className="block">
        <FotoProduto url={p.imagemUrl} alt={p.imagemAlt} sizes="(min-width:1024px) 22vw, (min-width:640px) 33vw, 50vw" prioridade={prioridade} className="aspect-square w-full rounded-[var(--radius-card)]" />
        <h3 className="mt-3 text-sm font-medium group-hover:underline underline-offset-4">{p.nome}</h3>
        <div className="mt-1"><Preco centavos={p.precoCentavos} promocionalCentavos={p.promocionalCentavos} aPartirDe={p.aPartirDe} /></div>
        <p className="mt-1 text-xs text-marrom-suave">{p.esgotado ? "Esgotado" : p.tipo === "SOB_ENCOMENDA" ? "Sob encomenda" : "Pronta para envio"}</p>
      </Link>
      {p.cores.length > 0 && (
        <ul className="mt-2 flex gap-1" aria-label="Cores disponíveis">
          {p.cores.slice(0, 8).map((c) => (
            <li key={c.slug} title={c.nome} className="size-4 rounded-full border border-linha" style={{ background: c.hex ?? "linear-gradient(135deg,#f4f1ee,#b9b2ab)" }}><span className="sr-only">{c.nome}</span></li>
          ))}
        </ul>
      )}
      {p.esgotado && <span className="absolute left-2 top-2 rounded-full bg-marrom px-3 py-1 text-xs text-creme">Esgotado</span>}
      <BotaoFavorito slug={p.slug} nome={p.nome} className="absolute right-2 top-2" />
    </article>
  );
}
