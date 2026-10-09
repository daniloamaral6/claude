import { notFound } from "next/navigation";
import { formatarBRL } from "@/lib/moeda";
import { mascararCpf } from "@/lib/validacoes";
import { exigirPainel } from "@/server/auth";
import { NOME_STATUS, obterPedido, TRANSICOES } from "@/server/pedidos";
import { FormStatus } from "./FormStatus";

export const dynamic = "force-dynamic";

export default async function PedidoDetalhe({ params }: { params: Promise<{ id: string }> }) {
  await exigirPainel();
  const { id } = await params;
  const p = await obterPedido(id);
  if (!p) notFound();
  const dt = (d: Date) => d.toLocaleString("pt-BR", { dateStyle: "short", timeStyle: "short" });
  return (
    <div className="max-w-4xl space-y-6">
      <div>
        <h1 className="text-2xl font-light tracking-wide sm:text-3xl">Pedido #{p.numero}</h1>
        <p className="mt-1 text-sm text-marrom-suave">{dt(p.criadoEm)} · <strong className="text-marrom">{NOME_STATUS[p.status]}</strong></p>
      </div>
      <div className="grid gap-6 md:grid-cols-2">
        <section aria-labelledby="cli" className="rounded-[var(--radius-card)] border border-linha bg-white p-5 text-sm">
          <h2 id="cli" className="mb-2 font-medium">Cliente e entrega</h2>
          <p>{p.nome}</p><p>{p.email}</p>{p.telefone && <p>{p.telefone}</p>}
          <p className="mt-3">{p.entregaDestinatario}<br />{p.entregaLogradouro}, {p.entregaNumero}{p.entregaComplemento ? ` — ${p.entregaComplemento}` : ""}<br />{p.entregaBairro} — {p.entregaCidade}/{p.entregaUf}<br />CEP {p.entregaCep}</p>
          {p.clienteDocumento && <p className="mt-2 text-marrom-suave">CPF {mascararCpf(p.clienteDocumento)}</p>}
          {p.freteServico && <p className="mt-3 text-marrom-suave">Frete: {p.freteServico}{p.fretePrazoDias != null ? ` · ${p.fretePrazoDias} dias úteis de transporte + ${p.prazoPreparoDias} de preparo` : ""}</p>}
        </section>
        <section aria-labelledby="val" className="rounded-[var(--radius-card)] border border-linha bg-white p-5 text-sm">
          <h2 id="val" className="mb-2 font-medium">Valores</h2>
          <dl className="space-y-1">
            <div className="flex justify-between"><dt>Subtotal</dt><dd>{formatarBRL(p.subtotalCentavos)}</dd></div>
            <div className="flex justify-between"><dt>Desconto{p.cupomCodigo ? ` (${p.cupomCodigo})` : ""}</dt><dd>− {formatarBRL(p.descontoCentavos)}</dd></div>
            <div className="flex justify-between"><dt>Frete</dt><dd>{formatarBRL(p.freteCentavos)}</dd></div>
            <div className="flex justify-between border-t border-linha pt-2 font-semibold"><dt>Total</dt><dd>{formatarBRL(p.totalCentavos)}</dd></div>
          </dl>
          {p.pagamentos.map((g) => (
            <p key={g.id} className="mt-3 text-marrom-suave">Pagamento: {g.metodo === "PIX" ? "Pix" : `Cartão${g.parcelas ? ` ${g.parcelas}x` : ""}`} · <strong className="text-marrom">{g.status.toLowerCase()}</strong>{g.statusDetalhe ? ` (${g.statusDetalhe})` : ""}<br /><span className="text-xs">{g.provedor} #{g.idExterno}</span></p>
          ))}
          {p.status === "AGUARDANDO_PAGAMENTO" && p.expiraEm && <p className="mt-3 text-xs text-marrom-suave">Expira em {dt(p.expiraEm)} se não for pago (o estoque volta).</p>}
        </section>
      </div>
      <section aria-labelledby="itens" className="rounded-[var(--radius-card)] border border-linha bg-white p-5">
        <h2 id="itens" className="mb-3 font-medium">Itens</h2>
        <ul className="divide-y divide-linha text-sm">
          {p.itens.map((i) => (
            <li key={i.id} className="flex justify-between gap-3 py-2">
              <span>{i.quantidade}× {i.nomeProduto} <span className="text-marrom-suave">({i.sku}{i.corNome ? ` · ${i.corNome}` : ""}{i.tamanho ? ` · ${i.tamanho}` : ""})</span>
                {i.personalizacao ? <span className="block text-marrom-suave">Personalização: {JSON.stringify(i.personalizacao)}</span> : null}</span>
              <span>{formatarBRL(i.precoUnitarioCentavos * i.quantidade)}</span>
            </li>
          ))}
        </ul>
      </section>
      <section aria-labelledby="acao" className="rounded-[var(--radius-card)] border border-linha bg-white p-5">
        <h2 id="acao" className="mb-4 font-medium">Andamento</h2>
        <FormStatus id={p.id} pago={p.pagamentos.some((g) => g.status === "APROVADO")} rastreio={p.codigoRastreio ?? ""} proximos={TRANSICOES[p.status].map((s) => ({ valor: s, nome: NOME_STATUS[s] }))} />
      </section>
      <section aria-labelledby="hist" className="rounded-[var(--radius-card)] border border-linha bg-white p-5">
        <h2 id="hist" className="mb-3 font-medium">Histórico</h2>
        {p.historico.length === 0 ? <p className="text-sm text-marrom-suave">Sem alterações registradas.</p> : (
          <ol className="space-y-2 text-sm">
            {p.historico.map((h) => <li key={h.id}>{dt(h.criadoEm)} — {h.de ? `${NOME_STATUS[h.de]} → ` : ""}<strong>{NOME_STATUS[h.para]}</strong>{h.autor ? ` · ${h.autor.nome ?? h.autor.email}` : ""}{h.nota ? <span className="block text-marrom-suave">{h.nota}</span> : null}</li>)}
          </ol>
        )}
      </section>
    </div>
  );
}
