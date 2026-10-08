import Link from "next/link";
import { brl, produtosExemplo } from "@/lib/exemplo";
import { categorias } from "@/lib/site";

export const metadata = { title: "Produtos" };

export default function Produtos() {
  return (
    <div>
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-2xl font-light tracking-wide sm:text-3xl">Produtos</h1>
        <Link href="/admin/produtos/novo" className="btn btn-primary">Novo produto</Link>
      </div>
      <div className="mt-6 overflow-x-auto rounded-[var(--radius-card)] border border-linha bg-white">
        <table className="w-full min-w-[640px] text-left text-sm">
          <caption className="sr-only">Lista de produtos</caption>
          <thead className="border-b border-linha bg-creme-profundo text-xs uppercase tracking-wider">
            <tr>{["Produto", "Categoria", "Preço", "Tipo", "Status"].map((h) => <th key={h} scope="col" className="px-4 py-3 font-medium">{h}</th>)}</tr>
          </thead>
          <tbody className="divide-y divide-linha">
            {produtosExemplo.map((p) => (
              <tr key={p.slug}>
                <th scope="row" className="px-4 py-3 font-medium"><Link href="/admin/produtos/novo" className="underline-offset-4 hover:underline">{p.nome}</Link></th>
                <td className="px-4 py-3">{categorias.find((c) => c.slug === p.categoria)?.nome}</td>
                <td className="px-4 py-3">{brl(p.promocional ?? p.preco)}</td>
                <td className="px-4 py-3">{p.disponibilidade === "pronta" ? "Pronta entrega" : "Sob encomenda"}</td>
                <td className="px-4 py-3"><span className="rounded-full bg-creme-profundo px-2 py-1 text-xs">Ativo</span></td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
