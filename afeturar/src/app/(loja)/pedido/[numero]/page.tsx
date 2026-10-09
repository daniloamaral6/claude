import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { formatarBRL } from "@/lib/moeda";
import { formatarCep } from "@/lib/validacoes";
import { clienteAtual } from "@/server/auth-cliente";
import { obterPedidoPublico } from "@/server/checkout";
import { NOME_STATUS } from "@/server/pedidos";
import { AtualizadorStatus } from "./AtualizadorStatus";
import { PixPagamento } from "./PixPagamento";

export const metadata: Metadata = { title: "Seu pedido", robots: { index: false, follow: false } };
export const dynamic = "force-dynamic";

const dataHora = (d: Date) => d.toLocaleString("pt-BR", { dateStyle: "short", timeStyle: "short", timeZone: "America/Sao_Paulo" });

export default async function PaginaPedido({ params, searchParams }: { params: Promise<{ numero: string }>; searchParams: Promise<{ c?: string }> }) {
  const [{ numero }, { c }, cliente] = await Promise.all([params, searchParams, clienteAtual()]);
  const p = await obterPedidoPublico(Number(numero), { codigo: c ?? null, usuarioId: cliente?.id ?? null });
  if (!p) notFound();
  const pag = p.pagamentos[0];
  const pagoOuAdiante = !["AGUARDANDO_PAGAMENTO", "CANCELADO"].includes(p.status);
  const prazoTotal = p.prazoPreparoDias + (p.fretePrazoDias ?? 0);
  const titulo = { AGUARDANDO_PAGAMENTO: "Aguardando o pagamento", PAGAMENTO_APROVADO: "Pagamento aprovado!", EM_PREPARACAO: "Estamos preparando seu pedido", PRONTO_PARA_ENVIO: "Seu pedido está pronto para envio", ENVIADO: "Seu pedido foi enviado", ENTREGUE: "Pedido entregue", CANCELADO: "Pedido cancelado" }[p.status];

  return (
    <div className="container-loja max-w-4xl py-8 sm:py-12">
      <AtualizadorStatus numero={p.numero} codigo={c ?? null} statusAtual={p.status} />
      <p className="text-sm text-marrom-suave">Pedido #{p.numero} · {dataHora(p.criadoEm)}</p>
      <h1 className="mt-1 text-3xl tracking-wide sm:text-4xl" aria-live="polite">{titulo}</h1>
      {p.status === "AGUARDANDO_PAGAMENTO" && pag?.metodo === "CARTAO" && <p className="mt-3 text-marrom-suave" role="status">Estamos confirmando o pagamento do seu cartão. Esta página atualiza sozinha.</p>}
      {pagoOuAdiante && <p className="mt-3 text-marrom-suave">Enviamos os detalhes para <strong>{p.email}</strong>.</p>}
      {p.status === "CANCELADO" && <p className="mt-3 text-marrom-suave">Este pedido foi cancelado. Se você pagou, o valor será estornado. Se ainda quiser os produtos, <Link href="/loja" className="underline underline-offset-4">faça um novo pedido</Link>.</p>}

      {p.status === "AGUARDANDO_PAGAMENTO" && pag?.metodo === "PIX" && pag.pixCopiaECola && (
        <div className="mt-6"><PixPagamento copiaECola={pag.pixCopiaECola} qrBase64={pag.pixQrBase64} expiraEm={(pag.pixExpiraEm ?? p.expiraEm)?.toISOString() ?? null} /></div>
      )}

      {p.codigoRastreio && (
        <p className="mt-6 rounded-[var(--radius-card)] border border-linha bg-white p-4 text-sm">Código de rastreio: <strong>{p.codigoRastreio}</strong>{p.freteServico ? ` · ${p.freteServico}` : ""}</p>
      )}

      <div className="mt-8 grid gap-6 md:grid-cols-2">
        <section aria-labelledby="itens" className="rounded-[var(--radius-card)] border border-linha bg-white p-5">
          <h2 id="itens" className="text-xl">Itens</h2>
          <ul className="mt-3 divide-y divide-linha text-sm">
            {p.itens.map((i) => (
              <li key={i.id} className="flex justify-between gap-3 py-2">
                <span>{i.quantidade}× {i.nomeProduto}{(i.corNome || i.tamanho) && <span className="text-marrom-suave"> ({[i.corNome, i.tamanho].filter(Boolean).join(", ")})</span>}
                  {Array.isArray(i.personalizacao) && (i.personalizacao as { rotulo: string; texto: string }[]).map((x) => <span key={x.rotulo} className="block text-marrom-suave">{x.rotulo}: {x.texto}</span>)}</span>
                <span>{formatarBRL(i.precoUnitarioCentavos * i.quantidade)}</span>
              </li>
            ))}
          </ul>
          <dl className="mt-3 space-y-1 border-t border-linha pt-3 text-sm">
            <div className="flex justify-between"><dt>Subtotal</dt><dd>{formatarBRL(p.subtotalCentavos)}</dd></div>
            {p.descontoCentavos > 0 && <div className="flex justify-between"><dt>Desconto{p.cupomCodigo ? ` (${p.cupomCodigo})` : ""}</dt><dd>− {formatarBRL(p.descontoCentavos)}</dd></div>}
            <div className="flex justify-between"><dt>Frete</dt><dd>{p.freteCentavos === 0 ? "Grátis" : formatarBRL(p.freteCentavos)}</dd></div>
            <div className="flex justify-between text-base font-semibold"><dt>Total</dt><dd>{formatarBRL(p.totalCentavos)}</dd></div>
          </dl>
        </section>
        <section aria-labelledby="entrega" className="rounded-[var(--radius-card)] border border-linha bg-white p-5 text-sm">
          <h2 id="entrega" className="text-xl">Entrega</h2>
          <p className="mt-3">{p.entregaDestinatario}<br />{p.entregaLogradouro}, {p.entregaNumero}{p.entregaComplemento ? ` — ${p.entregaComplemento}` : ""}<br />{p.entregaBairro} — {p.entregaCidade}/{p.entregaUf}<br />CEP {formatarCep(p.entregaCep)}</p>
          {p.freteServico && <p className="mt-3 text-marrom-suave">{p.freteServico}{p.fretePrazoDias != null ? ` · previsão de até ${prazoTotal} dias úteis após a aprovação do pagamento` : ""}</p>}
        </section>
      </div>

      <section aria-labelledby="hist" className="mt-6 rounded-[var(--radius-card)] border border-linha bg-white p-5">
        <h2 id="hist" className="text-xl">Andamento</h2>
        <ol className="mt-3 space-y-2 text-sm">
          {[...p.historico].reverse().map((h) => <li key={h.id}><span className="text-marrom-suave">{dataHora(h.criadoEm)}</span> — <strong>{NOME_STATUS[h.para]}</strong></li>)}
        </ol>
      </section>
      <p className="mt-6 text-sm"><Link href="/loja" className="underline underline-offset-4">Continuar comprando</Link></p>
    </div>
  );
}
