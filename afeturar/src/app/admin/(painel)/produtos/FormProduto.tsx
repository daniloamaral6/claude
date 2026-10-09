"use client";

import { useActionState, useState } from "react";
import { aoEnviar, BotaoEnvio, Campo, MensagemEstado, propsCampo, Secao, type Estado } from "@/components/admin/Ui";
import { salvarProduto } from "./actions";

import { type ProdutoForm, type VariacaoForm } from "./modelo";

export function FormProduto({ inicial, categorias, cores }: { inicial: ProdutoForm; categorias: { id: string; nome: string }[]; cores: { id: string; nome: string; ativa: boolean }[] }) {
  const [estado, acao, pendente] = useActionState<Estado, FormData>(salvarProduto, {});
  const [variacoes, setVariacoes] = useState(inicial.variacoes);
  const [opcoes, setOpcoes] = useState(inicial.opcoes);
  const [personalizavel, setPersonalizavel] = useState(inicial.personalizavel);
  const e = estado.erros ?? {};
  const t = (id: string, label: string, valor: string, extra: { dica?: string; tipo?: string; modo?: "numeric" | "decimal"; placeholder?: string; req?: boolean } = {}) => (
    <Campo id={id} label={label} erro={e[campoErro(id)]} dica={extra.dica}>
      <input {...propsCampo(id, e[campoErro(id)], extra.dica)} defaultValue={valor} type={extra.tipo ?? "text"} inputMode={extra.modo} placeholder={extra.placeholder} required={extra.req} className="campo" />
    </Campo>
  );
  const upd = (i: number, patch: Partial<VariacaoForm>) => setVariacoes((vs) => vs.map((v, k) => (k === i ? { ...v, ...patch } : v)));

  return (
    <form onSubmit={aoEnviar(acao)} className="max-w-4xl space-y-6" noValidate>
      {inicial.id && <input type="hidden" name="id" value={inicial.id} />}
      <input type="hidden" name="variacoesJson" value={JSON.stringify(variacoes)} />
      <input type="hidden" name="opcoesJson" value={JSON.stringify(personalizavel ? opcoes : [])} />

      <Secao id="s-geral" titulo="Informações gerais">
        {t("nome", "Nome do produto", inicial.nome, { req: true })}
        <Campo id="descricao" label="Descrição comercial" erro={e.descricao}><textarea {...propsCampo("descricao", e.descricao)} rows={5} defaultValue={inicial.descricao} className="campo py-2" /></Campo>
        <Campo id="caracteristicas" label="Características e benefícios" erro={e.caracteristicas} dica="Uma por linha."><textarea {...propsCampo("caracteristicas", e.caracteristicas, "x")} rows={4} defaultValue={inicial.caracteristicas} className="campo py-2" /></Campo>
        <div className="grid gap-4 sm:grid-cols-2">
          <Campo id="categoriaId" label="Categoria" erro={e.categoriaId}>
            <select {...propsCampo("categoriaId", e.categoriaId)} defaultValue={inicial.categoriaId} className="campo"><option value="">Selecione…</option>{categorias.map((c) => <option key={c.id} value={c.id}>{c.nome}</option>)}</select>
          </Campo>
          <Campo id="tipo" label="Disponibilidade" erro={e.tipo}>
            <select {...propsCampo("tipo", e.tipo)} defaultValue={inicial.tipo} className="campo"><option value="PRONTA_ENTREGA">Pronta para envio</option><option value="SOB_ENCOMENDA">Sob encomenda</option></select>
          </Campo>
        </div>
        <div className="grid gap-4 sm:grid-cols-3">
          {t("preco", "Preço (R$)", inicial.preco, { modo: "decimal", placeholder: "49,90", req: true })}
          {t("promocional", "Preço promocional (R$)", inicial.promocional, { modo: "decimal", dica: "Opcional. Menor que o preço." })}
          {t("prazoPreparoDias", "Prazo de preparo (dias úteis)", inicial.prazoPreparoDias, { modo: "numeric", dica: "0 = envio imediato." })}
        </div>
        <fieldset className="flex flex-wrap gap-x-6 gap-y-1 text-sm">
          <legend className="sr-only">Opções do produto</legend>
          <label className="flex min-h-11 items-center gap-2"><input type="checkbox" name="destaque" defaultChecked={inicial.destaque} className="size-5 accent-terracota-escuro" /> Produto em destaque</label>
          <label className="flex min-h-11 items-center gap-2"><input type="checkbox" name="personalizavel" checked={personalizavel} onChange={(ev) => setPersonalizavel(ev.target.checked)} className="size-5 accent-terracota-escuro" /> Aceita personalização</label>
        </fieldset>
      </Secao>

      <Secao id="s-medidas" titulo="Dimensões, material e embalagem">
        <p className="text-xs text-marrom-suave">Informe apenas medidas reais, conferidas com a peça. O que ficar vazio não aparece na loja.</p>
        <div className="grid gap-4 sm:grid-cols-3">
          {t("larguraMm", "Largura (mm)", inicial.larguraMm, { modo: "numeric" })}
          {t("alturaMm", "Altura (mm)", inicial.alturaMm, { modo: "numeric" })}
          {t("profundidadeMm", "Profundidade (mm)", inicial.profundidadeMm, { modo: "numeric" })}
        </div>
        <div className="grid gap-4 sm:grid-cols-2">
          <Campo id="material" label="Material" erro={e.material}><input {...propsCampo("material", e.material)} defaultValue={inicial.material} className="campo" /></Campo>
          <Campo id="cuidados" label="Cuidados" erro={e.cuidados}><input {...propsCampo("cuidados", e.cuidados)} defaultValue={inicial.cuidados} className="campo" /></Campo>
        </div>
        <p className="pt-2 text-sm font-medium">Embalagem (para o cálculo de frete)</p>
        <div className="grid gap-4 sm:grid-cols-4">
          {t("pesoEmbalagemG", "Peso (g)", inicial.pesoEmbalagemG, { modo: "numeric" })}
          {t("compEmbalagemMm", "Comprimento (mm)", inicial.compEmbalagemMm, { modo: "numeric" })}
          {t("largEmbalagemMm", "Largura (mm)", inicial.largEmbalagemMm, { modo: "numeric" })}
          {t("altEmbalagemMm", "Altura (mm)", inicial.altEmbalagemMm, { modo: "numeric" })}
        </div>
      </Secao>

      <Secao id="s-variacoes" titulo="Variações (cor, tamanho, estoque)" acao={<button type="button" className="btn btn-secondary" onClick={() => setVariacoes((v) => [...v, { sku: "", corId: "", tamanho: "", preco: "", estoque: "0", prazo: "", disponivel: true, ativa: true }])}>Adicionar variação</button>}>
        <p className="text-xs text-marrom-suave">Cada variação tem SKU próprio e estoque próprio. Preço e prazo em branco usam os do produto. Uma variação já vendida não é apagada: fica desativada.</p>
        {e.variacoes && <p role="alert" className="text-sm text-erro">{e.variacoes}</p>}
        <ul className="space-y-4">
          {variacoes.map((v, i) => {
            const er = (c: string) => e[`variacoes.${i}.${c}`];
            return (
              <li key={v.id ?? `n${i}`} className="rounded-lg border border-linha p-4">
                <div className="grid gap-3 sm:grid-cols-3">
                  <Campo id={`v${i}-sku`} label="SKU" erro={er("sku")}><input {...propsCampo(`v${i}-sku`, er("sku"))} name={undefined} value={v.sku} onChange={(ev) => upd(i, { sku: ev.target.value })} className="campo" /></Campo>
                  <Campo id={`v${i}-cor`} label="Cor"><select id={`v${i}-cor`} value={v.corId} onChange={(ev) => upd(i, { corId: ev.target.value })} className="campo"><option value="">Sem cor</option>{cores.filter((c) => c.ativa || c.id === v.corId).map((c) => <option key={c.id} value={c.id}>{c.nome}</option>)}</select></Campo>
                  <Campo id={`v${i}-tam`} label="Tamanho" erro={er("tamanho")}><input {...propsCampo(`v${i}-tam`, er("tamanho"))} name={undefined} value={v.tamanho} onChange={(ev) => upd(i, { tamanho: ev.target.value })} className="campo" /></Campo>
                  <Campo id={`v${i}-estoque`} label="Estoque" erro={er("estoque")}><input {...propsCampo(`v${i}-estoque`, er("estoque"))} name={undefined} inputMode="numeric" value={v.estoque} onChange={(ev) => upd(i, { estoque: ev.target.value })} className="campo" /></Campo>
                  <Campo id={`v${i}-preco`} label="Preço próprio (R$)" erro={er("precoCentavos")}><input {...propsCampo(`v${i}-preco`, er("precoCentavos"))} name={undefined} inputMode="decimal" value={v.preco} onChange={(ev) => upd(i, { preco: ev.target.value })} className="campo" /></Campo>
                  <Campo id={`v${i}-prazo`} label="Prazo próprio (dias)" erro={er("prazoPreparoDias")}><input {...propsCampo(`v${i}-prazo`, er("prazoPreparoDias"))} name={undefined} inputMode="numeric" value={v.prazo} onChange={(ev) => upd(i, { prazo: ev.target.value })} className="campo" /></Campo>
                </div>
                <div className="mt-3 flex flex-wrap items-center gap-x-6 gap-y-1 text-sm">
                  <label className="flex min-h-11 items-center gap-2"><input type="checkbox" checked={v.ativa} onChange={(ev) => upd(i, { ativa: ev.target.checked })} className="size-5 accent-terracota-escuro" /> Ativa</label>
                  <label className="flex min-h-11 items-center gap-2"><input type="checkbox" checked={v.disponivel} onChange={(ev) => upd(i, { disponivel: ev.target.checked })} className="size-5 accent-terracota-escuro" /> Disponível para compra</label>
                  <button type="button" className="ml-auto min-h-11 underline underline-offset-4 hover:text-erro" onClick={() => setVariacoes((vs) => vs.filter((_, k) => k !== i))}>Remover variação<span className="sr-only"> {i + 1}</span></button>
                </div>
              </li>
            );
          })}
        </ul>
      </Secao>

      {personalizavel && (
        <Secao id="s-pers" titulo="Campos de personalização" acao={<button type="button" className="btn btn-secondary" onClick={() => setOpcoes((o) => [...o, { rotulo: "", obrigatoria: false, maxCaracteres: 60 }])}>Adicionar campo</button>}>
          {opcoes.length === 0 && <p className="text-sm text-marrom-suave">Ex.: “Nome a gravar”, “Texto da placa”. O cliente preenche ao comprar.</p>}
          <ul className="space-y-3">
            {opcoes.map((o, i) => (
              <li key={o.id ?? `o${i}`} className="grid items-end gap-3 sm:grid-cols-[1fr_120px_auto_auto]">
                <Campo id={`o${i}-rotulo`} label="Rótulo do campo" erro={e[`opcoesPersonalizacao.${i}.rotulo`]}><input {...propsCampo(`o${i}-rotulo`, e[`opcoesPersonalizacao.${i}.rotulo`])} name={undefined} value={o.rotulo} onChange={(ev) => setOpcoes((os) => os.map((x, k) => (k === i ? { ...x, rotulo: ev.target.value } : x)))} className="campo" /></Campo>
                <Campo id={`o${i}-max`} label="Máx. caracteres"><input id={`o${i}-max`} type="number" min={1} max={200} value={o.maxCaracteres} onChange={(ev) => setOpcoes((os) => os.map((x, k) => (k === i ? { ...x, maxCaracteres: Number(ev.target.value) } : x)))} className="campo" /></Campo>
                <label className="flex min-h-11 items-center gap-2 text-sm"><input type="checkbox" checked={o.obrigatoria} onChange={(ev) => setOpcoes((os) => os.map((x, k) => (k === i ? { ...x, obrigatoria: ev.target.checked } : x)))} className="size-5 accent-terracota-escuro" /> Obrigatório</label>
                <button type="button" className="min-h-11 text-sm underline underline-offset-4 hover:text-erro" onClick={() => setOpcoes((os) => os.filter((_, k) => k !== i))}>Remover</button>
              </li>
            ))}
          </ul>
        </Secao>
      )}

      <Secao id="s-seo" titulo="Buscadores (SEO)">
        {t("seoTitulo", "Título para o Google", inicial.seoTitulo, { dica: "Até 70 caracteres. Vazio = usa o nome do produto." })}
        <Campo id="seoDescricao" label="Descrição para o Google" erro={e.seoDescricao} dica="Até 160 caracteres."><textarea {...propsCampo("seoDescricao", e.seoDescricao, "x")} rows={2} defaultValue={inicial.seoDescricao} className="campo py-2" /></Campo>
      </Secao>

      <Secao id="s-publicar" titulo="Publicação">
        <label className="flex min-h-11 items-center gap-2 text-sm font-medium">
          <input type="checkbox" name="ativo" defaultChecked={inicial.ativo} disabled={!inicial.id || !inicial.temFotos} className="size-5 accent-terracota-escuro" /> Publicar na loja
        </label>
        <p className="text-xs text-marrom-suave">{!inicial.id ? "Salve como rascunho primeiro; depois adicione as fotos e publique." : !inicial.temFotos ? "Adicione ao menos uma foto (seção Fotos, abaixo) para poder publicar." : "Desmarque para tirar da loja sem apagar."}</p>
        {e.ativo && <p role="alert" className="text-sm text-erro">{e.ativo}</p>}
      </Secao>

      <MensagemEstado estado={estado} />
      <div className="flex gap-3"><BotaoEnvio pendente={pendente}>{inicial.id ? "Salvar alterações" : "Salvar rascunho"}</BotaoEnvio></div>
    </form>
  );
}

/** Mapeia o id do campo do formulário para o caminho do erro do schema. */
function campoErro(id: string): string {
  const mapa: Record<string, string> = { preco: "precoCentavos", promocional: "precoPromocionalCentavos" };
  return mapa[id] ?? id;
}
