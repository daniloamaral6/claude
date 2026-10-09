import Link from "next/link";
import { ProdutoCard } from "@/components/ProdutoCard";
import { coresDeProdutosPublicados, listarProdutosPublicos, type Ordem } from "@/server/catalogo";
import { lerFiltros, type ParamsBusca } from "./filtros";

interface Props {
  titulo: string;
  basePath: string;
  searchParams: ParamsBusca;
  categoriaSlug?: string;
  descricao?: string | null;
  migalhas?: { href: string; nome: string }[];
  subcategorias?: { slug: string; nome: string }[];
  ordemPadrao?: Ordem;
  mostrarBusca?: boolean;
  escondeOrdem?: boolean;
}

/** Página de listagem (categoria, loja, novidades, busca). Filtros por URL: funcionam sem JavaScript e podem ser compartilhados. */
export async function CatalogoPagina({ titulo, basePath, searchParams, categoriaSlug, descricao, migalhas = [], subcategorias = [], ordemPadrao, mostrarBusca, escondeOrdem }: Props) {
  const f = lerFiltros(searchParams, { ordem: ordemPadrao });
  const [r, cores] = await Promise.all([listarProdutosPublicos({ ...f, categoriaSlug }), coresDeProdutosPublicados()]);
  const ativos = (f.cores?.length ?? 0) + (f.tipo ? 1 : 0) + (f.promocao ? 1 : 0);
  const href = (pagina: number) => {
    const p = new URLSearchParams();
    if (f.q) p.set("q", f.q);
    f.cores?.forEach((c) => p.append("cor", c));
    if (f.tipo) p.set("tipo", f.tipo === "PRONTA_ENTREGA" ? "pronta" : "encomenda");
    if (f.promocao) p.set("promo", "1");
    if (f.ordem && f.ordem !== (ordemPadrao ?? "novidades")) p.set("ordem", f.ordem);
    if (pagina > 1) p.set("pagina", String(pagina));
    const qs = p.toString();
    return qs ? `${basePath}?${qs}` : basePath;
  };

  const filtros = (
    <div className="space-y-6">
      <fieldset>
        <legend className="mb-2 text-sm font-semibold">Disponibilidade</legend>
        {[["", "Todas"], ["pronta", "Pronta para envio"], ["encomenda", "Sob encomenda"]].map(([v, l]) => (
          <label key={v} className="flex min-h-9 items-center gap-2 text-sm"><input type="radio" name="tipo" value={v} defaultChecked={(f.tipo === "PRONTA_ENTREGA" ? "pronta" : f.tipo === "SOB_ENCOMENDA" ? "encomenda" : "") === v} className="size-4 accent-terracota-escuro" />{l}</label>
        ))}
      </fieldset>
      {cores.length > 0 && (
        <fieldset>
          <legend className="mb-2 text-sm font-semibold">Cor</legend>
          {cores.map((c) => (
            <label key={c.slug} className="flex min-h-9 items-center gap-2 text-sm">
              <input type="checkbox" name="cor" value={c.slug} defaultChecked={f.cores?.includes(c.slug)} className="size-4 accent-terracota-escuro" />
              <span aria-hidden className="size-4 rounded-full border border-linha" style={{ background: c.hex ?? "linear-gradient(135deg,#f4f1ee,#b9b2ab)" }} />{c.nome}
            </label>
          ))}
        </fieldset>
      )}
      <label className="flex min-h-9 items-center gap-2 text-sm font-medium"><input type="checkbox" name="promo" value="1" defaultChecked={f.promocao} className="size-4 accent-terracota-escuro" />Somente em promoção</label>
    </div>
  );

  return (
    <div className="container-loja py-8 sm:py-12">
      <nav aria-label="Você está em" className="text-sm text-marrom-suave">
        <Link href="/" className="underline-offset-4 hover:underline">Início</Link>
        {migalhas.map((m) => <span key={m.href}> <span aria-hidden>/</span> <Link href={m.href} className="underline-offset-4 hover:underline">{m.nome}</Link></span>)}
        <span aria-hidden> /</span> <span aria-current="page">{titulo}</span>
      </nav>
      <h1 className="mt-3 text-3xl tracking-wide sm:text-4xl">{titulo}</h1>
      {descricao && <p className="mt-2 max-w-2xl text-marrom-suave">{descricao}</p>}
      {subcategorias.length > 0 && (
        <ul className="mt-4 flex flex-wrap gap-2" aria-label="Subcategorias">
          {subcategorias.map((s) => <li key={s.slug}><Link href={`/categorias/${s.slug}`} className="inline-flex min-h-11 items-center rounded-full border border-marrom px-4 text-sm hover:bg-creme-profundo">{s.nome}</Link></li>)}
        </ul>
      )}

      <form action={basePath} method="get" className="mt-8 grid gap-8 lg:grid-cols-[220px_1fr]">
        {mostrarBusca && <input type="hidden" name="q" value={f.q} />}
        <aside aria-label="Filtros" className="hidden lg:block">
          {filtros}
          <button type="submit" className="btn btn-primary mt-6 w-full">Aplicar filtros</button>
          {ativos > 0 && <Link href={f.q ? `${basePath}?q=${encodeURIComponent(f.q)}` : basePath} className="mt-3 block text-center text-sm underline underline-offset-4">Limpar filtros</Link>}
        </aside>

        <section aria-label="Produtos">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <details className="lg:hidden">
              <summary className="btn btn-secondary cursor-pointer list-none">Filtros{ativos > 0 && ` (${ativos})`}</summary>
              <div className="mt-3 rounded-[var(--radius-card)] border border-linha bg-white p-4">{filtros}<button type="submit" className="btn btn-primary mt-4 w-full">Aplicar filtros</button></div>
            </details>
            <p className="text-sm text-marrom-suave" role="status">{r.total} {r.total === 1 ? "produto" : "produtos"}{f.q ? ` para “${f.q}”` : ""}</p>
            {!escondeOrdem && (
              <div className="flex items-center gap-2">
                <label htmlFor="ordem" className="text-sm">Ordenar por</label>
                <select id="ordem" name="ordem" defaultValue={f.ordem} className="campo w-auto">
                  <option value="novidades">Novidades</option><option value="menor">Menor preço</option><option value="maior">Maior preço</option>
                </select>
                <button type="submit" className="btn btn-secondary">OK</button>
              </div>
            )}
          </div>

          {r.itens.length === 0 ? (
            <div className="mt-8 rounded-[var(--radius-card)] border border-dashed border-linha px-6 py-14 text-center">
              <p className="font-medium">{ativos > 0 || f.q ? "Nenhum produto encontrado" : "Ainda não há produtos aqui"}</p>
              <p className="mt-1 text-sm text-marrom-suave">{ativos > 0 || f.q ? "Tente remover alguns filtros ou buscar por outra palavra." : "Volte em breve: estamos preparando novidades."}</p>
              {(ativos > 0 || f.q) && <Link href={basePath} className="btn btn-primary mt-5">Limpar filtros e busca</Link>}
            </div>
          ) : (
            <ul className="mt-6 grid grid-cols-2 gap-x-4 gap-y-8 md:grid-cols-3">
              {r.itens.map((p, i) => <li key={p.id}><ProdutoCard p={p} prioridade={i < 4} /></li>)}
            </ul>
          )}

          {r.paginas > 1 && (
            <nav aria-label="Páginas" className="mt-10 flex items-center justify-center gap-3 text-sm">
              {r.pagina > 1 ? <Link href={href(r.pagina - 1)} rel="prev" className="btn btn-secondary">Anterior</Link> : <span />}
              <span>Página {r.pagina} de {r.paginas}</span>
              {r.pagina < r.paginas ? <Link href={href(r.pagina + 1)} rel="next" className="btn btn-secondary">Próxima</Link> : <span />}
            </nav>
          )}
        </section>
      </form>
    </div>
  );
}
