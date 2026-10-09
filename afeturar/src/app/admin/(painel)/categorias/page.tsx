import { exigirPainel } from "@/server/auth";
import { listarCategorias } from "@/server/categorias";
import { FormCategoria } from "./FormCategoria";

export const metadata = { title: "Categorias" };
export const dynamic = "force-dynamic";

export default async function Categorias() {
  await exigirPainel();
  const cats = await listarCategorias();
  const principais = cats.filter((c) => !c.paiId).map((c) => ({ id: c.id, nome: c.nome }));
  return (
    <div className="max-w-4xl">
      <h1 className="text-2xl font-light tracking-wide sm:text-3xl">Categorias</h1>
      <p className="mt-1 text-sm text-marrom-suave">Aparecem no menu e nos filtros da loja. Uma categoria com produtos não pode ser excluída: desative-a.</p>
      <section aria-labelledby="nova" className="mt-6 rounded-[var(--radius-card)] border border-linha bg-white p-5">
        <h2 id="nova" className="mb-3 font-medium">Nova categoria</h2>
        <FormCategoria principais={principais} />
      </section>
      <ul className="mt-6 space-y-3">
        {cats.map((c) => (
          <li key={c.id}>
            <details className="rounded-[var(--radius-card)] border border-linha bg-white">
              <summary className="flex min-h-12 cursor-pointer items-center justify-between gap-3 px-5 py-2">
                <span className="font-medium">{c.pai ? `${c.pai.nome} › ` : ""}{c.nome}</span>
                <span className="text-xs text-marrom-suave">{c.ativa ? "Visível" : "Oculta"} · {c._count.produtos} produto(s)</span>
              </summary>
              <div className="border-t border-linha p-5">
                <FormCategoria principais={principais} cat={{ id: c.id, nome: c.nome, descricao: c.descricao, paiId: c.paiId, ordem: c.ordem, ativa: c.ativa, produtos: c._count.produtos, filhas: c._count.filhas }} />
              </div>
            </details>
          </li>
        ))}
      </ul>
    </div>
  );
}
