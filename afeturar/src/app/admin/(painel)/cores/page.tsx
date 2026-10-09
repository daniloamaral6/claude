import { exigirPainel } from "@/server/auth";
import { listarCores } from "@/server/cores";
import { FormCor } from "./FormCor";

export const metadata = { title: "Cores" };
export const dynamic = "force-dynamic";

export default async function Cores() {
  await exigirPainel();
  const cores = await listarCores();
  return (
    <div className="max-w-4xl">
      <h1 className="text-2xl font-light tracking-wide sm:text-3xl">Cores das variações</h1>
      <p className="mt-1 text-sm text-marrom-suave">Novas cores ficam disponíveis na hora para as variações de qualquer produto, sem mexer em código.</p>
      <section aria-labelledby="nova" className="mt-6 rounded-[var(--radius-card)] border border-linha bg-white p-5">
        <h2 id="nova" className="mb-3 font-medium">Nova cor</h2>
        <FormCor />
      </section>
      <ul className="mt-6 space-y-3">
        {cores.map((c) => (
          <li key={c.id}>
            <details className="rounded-[var(--radius-card)] border border-linha bg-white">
              <summary className="flex min-h-12 cursor-pointer items-center justify-between gap-3 px-5 py-2">
                <span className="flex items-center gap-3 font-medium">
                  <span aria-hidden className="size-5 rounded-full border border-linha" style={{ background: c.hex ?? "linear-gradient(135deg,#f4f1ee,#b9b2ab)" }} />{c.nome}
                </span>
                <span className="text-xs text-marrom-suave">{c.ativa ? "Ativa" : "Inativa"} · {c._count.variacoes} variação(ões)</span>
              </summary>
              <div className="border-t border-linha p-5"><FormCor cor={{ id: c.id, nome: c.nome, hex: c.hex, ativa: c.ativa, emUso: c._count.variacoes }} /></div>
            </details>
          </li>
        ))}
      </ul>
    </div>
  );
}
