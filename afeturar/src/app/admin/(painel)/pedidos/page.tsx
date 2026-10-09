import Link from "next/link";
import type { StatusPedido } from "@/generated/prisma/client";
import { formatarBRL } from "@/lib/moeda";
import { exigirPainel } from "@/server/auth";
import { listarPedidos, NOME_STATUS } from "@/server/pedidos";

export const metadata = { title: "Pedidos" };
export const dynamic = "force-dynamic";

export default async function Pedidos({ searchParams }: { searchParams: Promise<{ status?: string; q?: string; pagina?: string }> }) {
  await exigirPainel();
  const sp = await searchParams;
  const status = sp.status && sp.status in NOME_STATUS ? (sp.status as StatusPedido) : undefined;
  const r = await listarPedidos({ status, busca: sp.q?.trim() || undefined, pagina: Number(sp.pagina) || 1 });
  const link = (pagina: number) => `/admin/pedidos?${new URLSearchParams({ ...(status ? { status } : {}), ...(sp.q ? { q: sp.q } : {}), pagina: String(pagina) })}`;
  return (
    <div>
      <h1 className="text-2xl font-light tracking-wide sm:text-3xl">Pedidos</h1>
      <form className="mt-4 flex flex-wrap items-end gap-3" role="search">
        <div><label htmlFor="q" className="mb-1 block text-sm">Buscar</label><input id="q" name="q" defaultValue={sp.q} placeholder="Nº, nome ou e-mail" className="campo w-60" /></div>
        <div><label htmlFor="status" className="mb-1 block text-sm">Status</label>
          <select id="status" name="status" defaultValue={status ?? ""} className="campo w-56"><option value="">Todos</option>{(Object.keys(NOME_STATUS) as StatusPedido[]).map((s) => <option key={s} value={s}>{NOME_STATUS[s]}</option>)}</select></div>
        <button type="submit" className="btn btn-secondary">Filtrar</button>
      </form>
      {r.itens.length === 0 ? (
        <p className="mt-8 rounded-[var(--radius-card)] border border-dashed border-linha px-6 py-12 text-center text-sm text-marrom-suave">Nenhum pedido encontrado.</p>
      ) : (
        <div className="mt-6 overflow-x-auto rounded-[var(--radius-card)] border border-linha bg-white">
          <table className="w-full min-w-[720px] text-left text-sm">
            <caption className="sr-only">Pedidos</caption>
            <thead className="border-b border-linha bg-creme-profundo text-xs uppercase tracking-wider"><tr>{["Pedido", "Data", "Cliente", "Total", "Status", "Rastreio"].map((h) => <th key={h} scope="col" className="px-4 py-3 font-medium">{h}</th>)}</tr></thead>
            <tbody className="divide-y divide-linha">
              {r.itens.map((p) => (
                <tr key={p.id}>
                  <th scope="row" className="px-4 py-3 font-medium"><Link href={`/admin/pedidos/${p.id}`} className="underline underline-offset-4 hover:text-terracota-escuro">#{p.numero}</Link></th>
                  <td className="px-4 py-3">{p.criadoEm.toLocaleDateString("pt-BR")}</td>
                  <td className="px-4 py-3">{p.nome}</td>
                  <td className="px-4 py-3">{formatarBRL(p.totalCentavos)}</td>
                  <td className="px-4 py-3">{NOME_STATUS[p.status]}</td>
                  <td className="px-4 py-3">{p.codigoRastreio ?? "—"}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
      {r.paginas > 1 && (
        <nav aria-label="Páginas" className="mt-4 flex items-center gap-3 text-sm">
          {r.pagina > 1 && <Link href={link(r.pagina - 1)} className="btn btn-secondary">Anterior</Link>}
          <span>Página {r.pagina} de {r.paginas}</span>
          {r.pagina < r.paginas && <Link href={link(r.pagina + 1)} className="btn btn-secondary">Próxima</Link>}
        </nav>
      )}
    </div>
  );
}
