import { brl, pedidosExemplo, produtosExemplo, statusPedido } from "@/lib/exemplo";

export default function Dashboard() {
  const validos = pedidosExemplo.filter((p) => p.status !== "Cancelado" && p.status !== "Aguardando pagamento");
  const fat = validos.reduce((s, p) => s + p.total, 0);
  const contagem = (s: string) => pedidosExemplo.filter((p) => p.status === s).length;
  const kpis = [
    ["Faturamento", brl(fat)],
    ["Total de pedidos", String(pedidosExemplo.length)],
    ["Aguardando pagamento", String(contagem("Aguardando pagamento"))],
    ["Em preparação", String(contagem("Em preparação"))],
    ["Enviados", String(contagem("Enviado"))],
    ["Concluídos", String(contagem("Entregue"))],
    ["Ticket médio", brl(fat / validos.length)],
  ];
  return (
    <div>
      <h1 className="text-2xl font-light tracking-wide sm:text-3xl">Dashboard</h1>
      <p className="mt-1 text-sm text-marrom-suave">Valores ilustrativos.</p>
      <dl className="mt-6 grid grid-cols-2 gap-3 md:grid-cols-4">
        {kpis.map(([t, v]) => (
          <div key={t} className="rounded-[var(--radius-card)] border border-linha bg-white p-4">
            <dt className="text-xs text-marrom-suave">{t}</dt>
            <dd className="mt-1 text-xl font-semibold">{v}</dd>
          </div>
        ))}
      </dl>
      <div className="mt-8 grid gap-6 lg:grid-cols-2">
        <section aria-labelledby="mv" className="rounded-[var(--radius-card)] border border-linha bg-white p-5">
          <h2 id="mv" className="font-medium">Produtos mais vendidos</h2>
          <ol className="mt-3 divide-y divide-linha text-sm">
            {produtosExemplo.slice(0, 4).map((p, i) => (
              <li key={p.slug} className="flex justify-between py-2"><span>{i + 1}. {p.nome}</span><span className="text-marrom-suave">{12 - i * 3} un.</span></li>
            ))}
          </ol>
        </section>
        <section aria-labelledby="fp" className="rounded-[var(--radius-card)] border border-linha bg-white p-5">
          <h2 id="fp" className="font-medium">Pedidos por status</h2>
          <ul className="mt-3 divide-y divide-linha text-sm">
            {statusPedido.map((s) => (
              <li key={s} className="flex justify-between py-2"><span>{s}</span><span className="font-medium">{contagem(s)}</span></li>
            ))}
          </ul>
        </section>
      </div>
    </div>
  );
}
