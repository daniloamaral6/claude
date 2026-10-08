import { brl, pedidosExemplo, statusPedido } from "@/lib/exemplo";

export const metadata = { title: "Pedidos" };

export default function Pedidos() {
  return (
    <div>
      <h1 className="text-2xl font-light tracking-wide sm:text-3xl">Pedidos</h1>
      <p className="mt-1 text-sm text-marrom-suave">Dados ilustrativos.</p>
      <div className="mt-4 flex flex-wrap items-center gap-2">
        <label htmlFor="fs" className="text-sm">Status</label>
        <select id="fs" className="campo w-auto"><option>Todos</option>{statusPedido.map((s) => <option key={s}>{s}</option>)}</select>
      </div>
      <div className="mt-4 overflow-x-auto rounded-[var(--radius-card)] border border-linha bg-white">
        <table className="w-full min-w-[760px] text-left text-sm">
          <caption className="sr-only">Lista de pedidos</caption>
          <thead className="border-b border-linha bg-creme-profundo text-xs uppercase tracking-wider">
            <tr>{["Pedido", "Data", "Cliente", "Total", "Status", "Rastreio"].map((h) => <th key={h} scope="col" className="px-4 py-3 font-medium">{h}</th>)}</tr>
          </thead>
          <tbody className="divide-y divide-linha">
            {pedidosExemplo.map((p) => (
              <tr key={p.id}>
                <th scope="row" className="px-4 py-3 font-medium">{p.id}</th>
                <td className="px-4 py-3">{p.data}</td>
                <td className="px-4 py-3">{p.cliente}</td>
                <td className="px-4 py-3">{brl(p.total)}</td>
                <td className="px-4 py-3">
                  <select aria-label={`Status do pedido ${p.id}`} defaultValue={p.status} className="campo min-h-9 w-auto">{statusPedido.map((s) => <option key={s}>{s}</option>)}</select>
                </td>
                <td className="px-4 py-3"><input aria-label={`Código de rastreio do pedido ${p.id}`} className="campo min-h-9 w-36" placeholder="Código" /></td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
