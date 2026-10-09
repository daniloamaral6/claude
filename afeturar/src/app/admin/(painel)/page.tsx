import { formatarBRL as brl } from "@/lib/moeda";
import { exigirPainel } from "@/server/auth";
import { indicadores } from "@/server/painel";
import { NOME_STATUS } from "@/server/pedidos";
import type { StatusPedido } from "@/generated/prisma/client";

export const metadata = { title: "Dashboard" };
export const dynamic = "force-dynamic";


export default async function Dashboard({ searchParams }: { searchParams: Promise<{ aviso?: string }> }) {
  await exigirPainel();
  const { aviso } = await searchParams;
  const i = await indicadores();
  const n = (s: StatusPedido) => i.porStatus[s] ?? 0;
  const kpis: [string, string][] = [
    ["Faturamento", brl(i.faturamentoCentavos)],
    ["Total de pedidos", String(i.totalPedidos)],
    ["Aguardando pagamento", String(n("AGUARDANDO_PAGAMENTO"))],
    ["Em preparação", String(n("EM_PREPARACAO"))],
    ["Enviados", String(n("ENVIADO"))],
    ["Concluídos", String(n("ENTREGUE"))],
    ["Ticket médio", brl(i.ticketMedioCentavos)],
  ];
  return (
    <div>
      <h1 className="text-2xl font-light tracking-wide sm:text-3xl">Dashboard</h1>
      {aviso === "sem-permissao" && <p role="alert" className="mt-3 rounded-lg border border-erro bg-white px-4 py-3 text-sm text-erro">Você não tem permissão para acessar essa área.</p>}
      <p className="mt-1 text-sm text-marrom-suave">O faturamento considera pedidos com pagamento aprovado em diante.</p>
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
          {i.maisVendidos.length === 0 ? <p className="mt-3 text-sm text-marrom-suave">Ainda não há vendas.</p> : (
            <ol className="mt-3 divide-y divide-linha text-sm">
              {i.maisVendidos.map((p, k) => <li key={p.nome} className="flex justify-between py-2"><span>{k + 1}. {p.nome}</span><span className="text-marrom-suave">{p.quantidade} un.</span></li>)}
            </ol>
          )}
        </section>
        <section aria-labelledby="fp" className="rounded-[var(--radius-card)] border border-linha bg-white p-5">
          <h2 id="fp" className="font-medium">Pedidos por status</h2>
          <ul className="mt-3 divide-y divide-linha text-sm">
            {(Object.keys(NOME_STATUS) as StatusPedido[]).map((s) => <li key={s} className="flex justify-between py-2"><span>{NOME_STATUS[s]}</span><span className="font-medium">{n(s)}</span></li>)}
          </ul>
        </section>
      </div>
    </div>
  );
}
