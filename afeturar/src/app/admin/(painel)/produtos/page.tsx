import Link from "next/link";
import { formatarBRL } from "@/lib/moeda";
import { exigirPainel } from "@/server/auth";
import { listarCategorias } from "@/server/categorias";
import { listarProdutos } from "@/server/produtos";

export const metadata = { title: "Produtos" };
export const dynamic = "force-dynamic";

export default async function Produtos({ searchParams }: { searchParams: Promise<{ q?: string; status?: string; categoria?: string; pagina?: string; excluido?: string; despublicado?: string }> }) {
  await exigirPainel();
  const sp = await searchParams;
  const status = sp.status === "ativo" || sp.status === "rascunho" ? sp.status : undefined;
  const [r, cats] = await Promise.all([listarProdutos({ busca: sp.q?.trim() || undefined, status, categoriaId: sp.categoria || undefined, pagina: Number(sp.pagina) || 1 }), listarCategorias()]);
  const link = (pagina: number) => `/admin/produtos?${new URLSearchParams({ ...(sp.q ? { q: sp.q } : {}), ...(status ? { status } : {}), ...(sp.categoria ? { categoria: sp.categoria } : {}), pagina: String(pagina) })}`;
  return (
    <div>
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-2xl font-light tracking-wide sm:text-3xl">Produtos</h1>
        <Link href="/admin/produtos/novo" className="btn btn-primary">Novo produto</Link>
      </div>
      {sp.excluido && <p role="status" className="mt-3 rounded-lg border border-terracota-escuro bg-white px-4 py-3 text-sm">Produto excluído.</p>}
      {sp.despublicado && <p role="status" className="mt-3 rounded-lg border border-terracota-escuro bg-white px-4 py-3 text-sm">Este produto já foi vendido, então foi apenas despublicado (os pedidos antigos continuam intactos).</p>}
      <form className="mt-4 flex flex-wrap items-end gap-3" role="search">
        <div><label htmlFor="q" className="mb-1 block text-sm">Buscar por nome ou SKU</label><input id="q" name="q" defaultValue={sp.q} className="campo w-64" /></div>
        <div><label htmlFor="categoria" className="mb-1 block text-sm">Categoria</label><select id="categoria" name="categoria" defaultValue={sp.categoria ?? ""} className="campo w-56"><option value="">Todas</option>{cats.map((c) => <option key={c.id} value={c.id}>{c.nome}</option>)}</select></div>
        <div><label htmlFor="status" className="mb-1 block text-sm">Situação</label><select id="status" name="status" defaultValue={status ?? ""} className="campo w-40"><option value="">Todas</option><option value="ativo">Publicados</option><option value="rascunho">Rascunhos</option></select></div>
        <button type="submit" className="btn btn-secondary">Filtrar</button>
      </form>
      {r.itens.length === 0 ? (
        <div className="mt-8 rounded-[var(--radius-card)] border border-dashed border-linha px-6 py-14 text-center">
          <p className="font-medium">{r.total === 0 && !sp.q && !status && !sp.categoria ? "Você ainda não cadastrou produtos." : "Nenhum produto encontrado."}</p>
          <Link href="/admin/produtos/novo" className="btn btn-primary mt-5">Cadastrar o primeiro produto</Link>
        </div>
      ) : (
        <div className="mt-6 overflow-x-auto rounded-[var(--radius-card)] border border-linha bg-white">
          <table className="w-full min-w-[720px] text-left text-sm">
            <caption className="sr-only">Produtos</caption>
            <thead className="border-b border-linha bg-creme-profundo text-xs uppercase tracking-wider"><tr>{["Produto", "Categoria", "Preço", "Estoque", "Situação"].map((h) => <th key={h} scope="col" className="px-4 py-3 font-medium">{h}</th>)}</tr></thead>
            <tbody className="divide-y divide-linha">
              {r.itens.map((p) => {
                const estoque = p.variacoes.filter((v) => v.ativa).reduce((s, v) => s + v.estoque, 0);
                return (
                  <tr key={p.id}>
                    <th scope="row" className="px-4 py-3 font-medium">
                      <Link href={`/admin/produtos/${p.id}`} className="flex items-center gap-3 underline-offset-4 hover:underline">
                        {p.imagens[0] ? // eslint-disable-next-line @next/next/no-img-element
                        <img src={p.imagens[0].url} alt="" className="size-10 rounded object-cover" /> : <span aria-hidden className="size-10 rounded bg-creme-profundo" />}
                        {p.nome}
                      </Link>
                    </th>
                    <td className="px-4 py-3">{p.categoria.nome}</td>
                    <td className="px-4 py-3">{p.precoPromocionalCentavos ? <><span className="font-semibold">{formatarBRL(p.precoPromocionalCentavos)}</span> <s className="text-marrom-suave">{formatarBRL(p.precoCentavos)}</s></> : formatarBRL(p.precoCentavos)}</td>
                    <td className="px-4 py-3">{p.variacoes.length === 0 ? "—" : estoque === 0 ? <span className="text-erro">Sem estoque</span> : `${estoque} un.`}</td>
                    <td className="px-4 py-3"><span className={`rounded-full px-2 py-1 text-xs ${p.ativo ? "bg-terracota-escuro text-creme" : "bg-creme-profundo"}`}>{p.ativo ? "Publicado" : "Rascunho"}</span></td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
      {r.paginas > 1 && (
        <nav aria-label="Páginas" className="mt-4 flex items-center gap-3 text-sm">
          {r.pagina > 1 && <Link href={link(r.pagina - 1)} className="btn btn-secondary">Anterior</Link>}
          <span>Página {r.pagina} de {r.paginas} · {r.total} produtos</span>
          {r.pagina < r.paginas && <Link href={link(r.pagina + 1)} className="btn btn-secondary">Próxima</Link>}
        </nav>
      )}
    </div>
  );
}
