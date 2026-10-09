import type { Metadata } from "next";
import Link from "next/link";
import { formatarBRL } from "@/lib/moeda";
import { clienteAtual } from "@/server/auth-cliente";
import { listarPedidosDoCliente } from "@/server/clientes";
import { NOME_STATUS } from "@/server/pedidos";
import { sair } from "./actions";
import { FormCadastrar, FormEntrar } from "./Formularios";

export const metadata: Metadata = { title: "Minha conta", robots: { index: false, follow: false } };
export const dynamic = "force-dynamic";

export default async function Conta({ searchParams }: { searchParams: Promise<{ senha?: string }> }) {
  const [cliente, { senha }] = await Promise.all([clienteAtual(), searchParams]);
  if (!cliente) {
    return (
      <div className="container-loja py-10 sm:py-14">
        <h1 className="text-3xl tracking-wide sm:text-4xl">Minha conta</h1>
        <p className="mt-2 text-sm text-marrom-suave">Ter conta é opcional: você pode comprar sem cadastro. Com ela, acompanha seus pedidos em um só lugar.</p>
        {senha === "redefinida" && <p role="status" className="mt-4 rounded-lg border border-terracota-escuro bg-white px-4 py-3 text-sm">Senha alterada. Entre com a nova senha.</p>}
        <div className="mt-8 grid gap-10 md:grid-cols-2">
          <section aria-labelledby="entrar-t" className="rounded-[var(--radius-card)] border border-linha bg-white p-6"><h2 id="entrar-t" className="mb-4 text-xl">Já tenho conta</h2><FormEntrar /></section>
          <section aria-labelledby="cadastrar-t" className="rounded-[var(--radius-card)] border border-linha bg-white p-6"><h2 id="cadastrar-t" className="mb-4 text-xl">Criar conta</h2><FormCadastrar /></section>
        </div>
        <p className="mt-8 text-sm">Comprou sem conta? <Link href="/acompanhar-pedido" className="underline underline-offset-4">Acompanhe seu pedido</Link>.</p>
      </div>
    );
  }
  const pedidos = await listarPedidosDoCliente(cliente.id);
  return (
    <div className="container-loja max-w-3xl py-10 sm:py-14">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div><h1 className="text-3xl tracking-wide sm:text-4xl">Olá, {cliente.nome?.split(" ")[0] ?? "cliente"}!</h1><p className="mt-1 text-sm text-marrom-suave">{cliente.email}</p></div>
        <form action={sair}><button type="submit" className="btn btn-secondary">Sair</button></form>
      </div>
      <section aria-labelledby="ped-t" className="mt-8">
        <h2 id="ped-t" className="text-xl">Meus pedidos</h2>
        {pedidos.length === 0 ? (
          <p className="mt-3 rounded-[var(--radius-card)] border border-dashed border-linha px-6 py-10 text-center text-sm text-marrom-suave">Você ainda não fez pedidos. <Link href="/loja" className="underline underline-offset-4">Conheça a loja</Link>.</p>
        ) : (
          <ul className="mt-3 divide-y divide-linha rounded-[var(--radius-card)] border border-linha bg-white">
            {pedidos.map((p) => (
              <li key={p.numero}>
                <Link href={`/pedido/${p.numero}`} className="flex min-h-14 flex-wrap items-center justify-between gap-2 px-4 py-3 hover:bg-creme-profundo">
                  <span><span className="font-medium">Pedido #{p.numero}</span> <span className="text-sm text-marrom-suave">· {p.criadoEm.toLocaleDateString("pt-BR", { timeZone: "America/Sao_Paulo" })}</span><span className="block text-sm text-marrom-suave">{p.itens.map((i) => `${i.quantidade}× ${i.nomeProduto}`).join(", ").slice(0, 90)}</span></span>
                  <span className="text-right text-sm"><span className="block font-semibold">{formatarBRL(p.totalCentavos)}</span>{NOME_STATUS[p.status]}</span>
                </Link>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}
