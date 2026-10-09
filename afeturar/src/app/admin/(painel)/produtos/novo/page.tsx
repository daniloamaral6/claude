import { exigirPainel } from "@/server/auth";
import { listarCategorias } from "@/server/categorias";
import { listarCores } from "@/server/cores";
import { FormProduto } from "../FormProduto";
import { produtoVazio } from "../modelo";

export const metadata = { title: "Novo produto" };
export const dynamic = "force-dynamic";

export default async function NovoProduto() {
  await exigirPainel();
  const [cats, cores] = await Promise.all([listarCategorias(), listarCores()]);
  return (
    <div>
      <h1 className="mb-6 text-2xl font-light tracking-wide sm:text-3xl">Novo produto</h1>
      {cats.length === 0 ? <p>Cadastre uma categoria antes de criar produtos.</p> : (
        <FormProduto inicial={produtoVazio} categorias={cats.map((c) => ({ id: c.id, nome: c.pai ? `${c.pai.nome} › ${c.nome}` : c.nome }))} cores={cores.map((c) => ({ id: c.id, nome: c.nome, ativa: c.ativa }))} />
      )}
    </div>
  );
}
