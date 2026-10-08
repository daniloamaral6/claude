import { cores } from "@/lib/exemplo";
import { categorias } from "@/lib/site";

export const metadata = { title: "Produto" };

function F({ id, label, children, dica }: { id: string; label: string; children: React.ReactNode; dica?: string }) {
  return (
    <div>
      <label htmlFor={id} className="mb-1 block text-sm font-medium">{label}</label>
      {children}
      {dica && <p className="mt-1 text-xs text-marrom-suave">{dica}</p>}
    </div>
  );
}

export default function EditorProduto() {
  return (
    <form className="max-w-4xl space-y-8" aria-label="Cadastro de produto">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-2xl font-light tracking-wide sm:text-3xl">Produto</h1>
        <div className="flex gap-2"><button type="button" className="btn btn-secondary">Salvar rascunho</button><button type="button" className="btn btn-primary">Publicar</button></div>
      </div>

      <section className="space-y-4 rounded-[var(--radius-card)] border border-linha bg-white p-5" aria-labelledby="g">
        <h2 id="g" className="font-medium">Informações gerais</h2>
        <F id="nome" label="Nome"><input id="nome" className="campo" /></F>
        <F id="desc" label="Descrição comercial"><textarea id="desc" rows={4} className="campo py-2" /></F>
        <div className="grid gap-4 sm:grid-cols-2">
          <F id="cat" label="Categoria"><select id="cat" className="campo">{categorias.map((c) => <option key={c.slug}>{c.nome}</option>)}</select></F>
          <F id="tipo" label="Tipo"><select id="tipo" className="campo"><option>Pronta para envio</option><option>Sob encomenda</option></select></F>
        </div>
        <div className="grid gap-4 sm:grid-cols-3">
          <F id="preco" label="Preço (R$)"><input id="preco" inputMode="decimal" className="campo" /></F>
          <F id="promo" label="Preço promocional (R$)"><input id="promo" inputMode="decimal" className="campo" /></F>
          <F id="prazo" label="Prazo de preparo (dias úteis)"><input id="prazo" inputMode="numeric" className="campo" /></F>
        </div>
        <div className="flex flex-wrap gap-6 text-sm">
          <label className="flex min-h-9 items-center gap-2"><input type="checkbox" className="size-4 accent-terracota-escuro" defaultChecked /> Anúncio ativo</label>
          <label className="flex min-h-9 items-center gap-2"><input type="checkbox" className="size-4 accent-terracota-escuro" /> Produto em destaque</label>
          <label className="flex min-h-9 items-center gap-2"><input type="checkbox" className="size-4 accent-terracota-escuro" /> Aceita personalização</label>
        </div>
      </section>

      <section className="space-y-4 rounded-[var(--radius-card)] border border-linha bg-white p-5" aria-labelledby="f">
        <h2 id="f" className="font-medium">Fotografias</h2>
        <div className="rounded-[var(--radius-card)] border border-dashed border-marrom-suave p-8 text-center text-sm text-marrom-suave">
          Arraste fotos reais do produto ou <button type="button" className="underline underline-offset-4">escolha arquivos</button>. A primeira é a foto principal.
        </div>
      </section>

      <section className="space-y-4 rounded-[var(--radius-card)] border border-linha bg-white p-5" aria-labelledby="e">
        <h2 id="e" className="font-medium">Medidas e envio</h2>
        <div className="grid gap-4 sm:grid-cols-3">
          {["Peso (g)", "Comprimento (cm)", "Largura (cm)", "Altura (cm)"].map((l, i) => <F key={l} id={`m${i}`} label={l} dica={i === 0 ? "Da embalagem, usado no frete" : undefined}><input id={`m${i}`} inputMode="decimal" className="campo" /></F>)}
        </div>
        <F id="mat" label="Material e cuidados" dica="Exibido na página do produto, quando relevante."><textarea id="mat" rows={2} className="campo py-2" /></F>
      </section>

      <section className="rounded-[var(--radius-card)] border border-linha bg-white p-5" aria-labelledby="v">
        <div className="flex items-center justify-between"><h2 id="v" className="font-medium">Variações</h2><button type="button" className="btn btn-secondary">Adicionar variação</button></div>
        <p className="mt-1 text-xs text-marrom-suave">Cada variação pode ter foto, SKU, preço, estoque, prazo e status próprios. Novas cores se cadastram aqui, sem alterar código.</p>
        <div className="mt-4 overflow-x-auto">
          <table className="w-full min-w-[720px] text-left text-sm">
            <caption className="sr-only">Variações do produto</caption>
            <thead className="text-xs uppercase tracking-wider"><tr>{["Cor", "SKU", "Preço", "Estoque", "Prazo", "Status"].map((h) => <th key={h} scope="col" className="px-2 py-2 font-medium">{h}</th>)}</tr></thead>
            <tbody className="divide-y divide-linha">
              {[cores[0], cores[1]].map((c) => (
                <tr key={c.id}>
                  <th scope="row" className="px-2 py-2 font-normal"><span className="inline-flex items-center gap-2"><span className="size-4 rounded-full border border-linha" style={{ background: c.css }} aria-hidden />{c.nome}</span></th>
                  {["SKU", "Preço", "Estoque", "Prazo"].map((n) => <td key={n} className="px-2 py-2"><input aria-label={`${n} — ${c.nome}`} className="campo min-h-9" /></td>)}
                  <td className="px-2 py-2"><select aria-label={`Status — ${c.nome}`} className="campo min-h-9 min-w-36"><option>Disponível</option><option>Indisponível</option></select></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>
    </form>
  );
}
