import Link from "next/link";
import { notFound } from "next/navigation";
import { exigirPainel } from "@/server/auth";
import { listarCategorias } from "@/server/categorias";
import { listarCores } from "@/server/cores";
import { MAX_IMAGENS_POR_PRODUTO } from "@/server/imagens";
import { obterProduto } from "@/server/produtos";
import { FormProduto } from "../FormProduto";
import { aPartirDoBanco } from "../modelo";
import { enviarFoto, excluirFoto, excluirProduto, moverFoto } from "../actions";

export const dynamic = "force-dynamic";

export default async function EditarProduto({ params, searchParams }: { params: Promise<{ id: string }>; searchParams: Promise<{ criado?: string; salvo?: string; erro?: string }> }) {
  await exigirPainel();
  const { id } = await params;
  const sp = await searchParams;
  const [p, cats, cores] = await Promise.all([obterProduto(id), listarCategorias(), listarCores()]);
  if (!p) notFound();
  return (
    <div className="max-w-4xl">
      <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-light tracking-wide sm:text-3xl">{p.nome}</h1>
          <p className="mt-1 text-sm text-marrom-suave">{p.ativo ? "Publicado" : "Rascunho"} · endereço: /produtos/{p.slug}</p>
        </div>
        <Link href="/admin/produtos" className="text-sm underline underline-offset-4">← Voltar à lista</Link>
      </div>
      {sp.criado && <p role="status" className="mb-4 rounded-lg border border-terracota-escuro bg-white px-4 py-3 text-sm">Rascunho criado. Agora adicione as fotos abaixo e depois publique.</p>}
      {sp.salvo && <p role="status" className="mb-4 rounded-lg border border-terracota-escuro bg-white px-4 py-3 text-sm">{sp.salvo === "publicado" ? "Produto salvo e publicado na loja." : "Produto salvo como rascunho (não aparece na loja)."}</p>}
      {sp.erro && <p role="alert" className="mb-4 rounded-lg border border-erro bg-white px-4 py-3 text-sm text-erro">{sp.erro}</p>}

      <FormProduto key={`${p.id}-${p.atualizadoEm.getTime()}`} inicial={aPartirDoBanco(p)} categorias={cats.map((c) => ({ id: c.id, nome: c.pai ? `${c.pai.nome} › ${c.nome}` : c.nome }))} cores={cores.map((c) => ({ id: c.id, nome: c.nome, ativa: c.ativa }))} />

      <section id="fotos" aria-labelledby="t-fotos" className="mt-6 scroll-mt-6 rounded-[var(--radius-card)] border border-linha bg-white p-5">
        <h2 id="t-fotos" className="font-medium">Fotos ({p.imagens.length}/{MAX_IMAGENS_POR_PRODUTO})</h2>
        <p className="mt-1 text-xs text-marrom-suave">A primeira é a foto principal. Use fotos reais do produto (JPG, PNG ou WebP, até 5 MB). O texto alternativo ajuda quem usa leitor de tela e o Google.</p>
        {p.imagens.length > 0 && (
          <ul className="mt-4 grid grid-cols-2 gap-4 sm:grid-cols-3">
            {p.imagens.map((img, i) => (
              <li key={img.id} className="rounded-lg border border-linha p-2 text-xs">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={img.url} alt={img.alt} className="aspect-square w-full rounded object-cover" />
                <p className="mt-2 truncate" title={img.alt}>{i === 0 ? <strong>Principal · </strong> : null}{img.alt}</p>
                <div className="mt-1 flex flex-wrap gap-1">
                  {(["cima", "baixo"] as const).map((d) => (
                    <form key={d} action={moverFoto}>
                      <input type="hidden" name="produtoId" value={p.id} /><input type="hidden" name="imagemId" value={img.id} /><input type="hidden" name="direcao" value={d} />
                      <button type="submit" disabled={(d === "cima" && i === 0) || (d === "baixo" && i === p.imagens.length - 1)} className="min-h-9 rounded border border-marrom px-2 disabled:border-linha disabled:text-marrom-suave">{d === "cima" ? "← Antes" : "Depois →"}</button>
                    </form>
                  ))}
                  <form action={excluirFoto}>
                    <input type="hidden" name="produtoId" value={p.id} /><input type="hidden" name="imagemId" value={img.id} />
                    <button type="submit" className="min-h-9 rounded border border-erro px-2 text-erro">Remover</button>
                  </form>
                </div>
              </li>
            ))}
          </ul>
        )}
        <form action={enviarFoto} className="mt-5 grid gap-3 border-t border-linha pt-4 sm:grid-cols-2">
          <input type="hidden" name="produtoId" value={p.id} />
          <div className="sm:col-span-2"><label htmlFor="arquivo" className="mb-1 block text-sm font-medium">Nova foto</label><input id="arquivo" name="arquivo" type="file" accept="image/jpeg,image/png,image/webp" required className="campo py-2" /></div>
          <div><label htmlFor="alt" className="mb-1 block text-sm font-medium">Texto alternativo</label><input id="alt" name="alt" maxLength={160} placeholder="Ex.: vaso branco sobre mesa de madeira" className="campo" /></div>
          <div><label htmlFor="variacaoId" className="mb-1 block text-sm font-medium">Foto de uma variação (opcional)</label>
            <select id="variacaoId" name="variacaoId" className="campo"><option value="">Todas / geral</option>{p.variacoes.map((v) => <option key={v.id} value={v.id}>{v.sku}</option>)}</select></div>
          <div className="sm:col-span-2"><button type="submit" className="btn btn-secondary" disabled={p.imagens.length >= MAX_IMAGENS_POR_PRODUTO}>Enviar foto</button></div>
        </form>
      </section>

      <section aria-labelledby="t-perigo" className="mt-6 rounded-[var(--radius-card)] border border-erro bg-white p-5">
        <h2 id="t-perigo" className="font-medium text-erro">Excluir produto</h2>
        <p className="mt-1 text-sm text-marrom-suave">Se o produto nunca foi vendido, ele é apagado. Se já foi vendido, é apenas despublicado para preservar o histórico dos pedidos.</p>
        <form action={excluirProduto} className="mt-3 flex flex-wrap items-center gap-4">
          <input type="hidden" name="id" value={p.id} />
          <label className="flex min-h-11 items-center gap-2 text-sm"><input type="checkbox" name="confirmo" className="size-5 accent-terracota-escuro" /> Entendo que isto não pode ser desfeito</label>
          <button type="submit" className="btn btn-secondary border-erro text-erro">Excluir produto</button>
        </form>
      </section>
    </div>
  );
}
