import { centavosParaTexto } from "@/lib/moeda";
import { exigirPainel } from "@/server/auth";
import { listarCupons } from "@/server/cupons";
import { FormCupom } from "./FormCupom";

export const metadata = { title: "Cupons" };
export const dynamic = "force-dynamic";

const dia = (d: Date | null) => (d ? new Date(d.getTime() - 3 * 3600_000).toISOString().slice(0, 10) : "");
const rotulo = { PERCENTUAL: "%", VALOR_FIXO: "R$", FRETE_GRATIS: "Frete grátis" } as const;

export default async function Cupons() {
  await exigirPainel();
  const cupons = await listarCupons();
  return (
    <div className="max-w-4xl">
      <h1 className="text-2xl font-light tracking-wide sm:text-3xl">Cupons de desconto</h1>
      <p className="mt-1 text-sm text-marrom-suave">O cliente digita o código no checkout. O limite de usos é respeitado mesmo com várias compras ao mesmo tempo.</p>
      <section aria-labelledby="novo" className="mt-6 rounded-[var(--radius-card)] border border-linha bg-white p-5"><h2 id="novo" className="mb-3 font-medium">Novo cupom</h2><FormCupom /></section>
      <ul className="mt-6 space-y-3">
        {cupons.map((c) => (
          <li key={c.id}>
            <details className="rounded-[var(--radius-card)] border border-linha bg-white">
              <summary className="flex min-h-12 cursor-pointer items-center justify-between gap-3 px-5 py-2">
                <span className="font-medium">{c.codigo} <span className="font-normal text-marrom-suave">· {c.tipo === "PERCENTUAL" ? `${c.valor}%` : c.tipo === "VALOR_FIXO" ? `R$ ${centavosParaTexto(c.valor)}` : rotulo.FRETE_GRATIS}</span></span>
                <span className="text-xs text-marrom-suave">{c.ativo ? "Ativo" : "Inativo"} · {c.usos}{c.usoMaximo ? `/${c.usoMaximo}` : ""} usos</span>
              </summary>
              <div className="border-t border-linha p-5">
                <FormCupom cupom={{ id: c.id, codigo: c.codigo, tipo: c.tipo, valor: c.tipo === "VALOR_FIXO" ? centavosParaTexto(c.valor) : String(c.valor), minimo: centavosParaTexto(c.minimoCentavos), usoMaximo: c.usoMaximo?.toString() ?? "", inicio: dia(c.inicioEm), fim: dia(c.fimEm ? new Date(c.fimEm.getTime() - 1000) : null), ativo: c.ativo, usos: c.usos }} />
              </div>
            </details>
          </li>
        ))}
      </ul>
    </div>
  );
}
