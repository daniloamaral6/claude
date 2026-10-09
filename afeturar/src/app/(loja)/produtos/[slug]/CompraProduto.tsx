"use client";

import Image from "next/image";
import Link from "next/link";
import { useActionState, useMemo, useState } from "react";
import { BotaoFavorito } from "@/components/BotaoFavorito";
import { Preco } from "@/components/Preco";
import { textoPrazo, type TipoProduto } from "@/lib/preco";
import type { Estado } from "@/server/acao";
import { adicionarAoCarrinho } from "../../carrinho/actions";

export interface DadosCompra {
  slug: string; nome: string; url: string; tipo: TipoProduto; personalizavel: boolean; whatsapp: string | null;
  opcoes: { id: string; rotulo: string; obrigatoria: boolean; maxCaracteres: number }[];
  variacoes: { id: string; corSlug: string | null; corNome: string | null; corHex: string | null; tamanho: string | null; precoCentavos: number; promocionalCentavos: number | null; compravel: boolean; quantidadeMaxima: number; prazoDias: number; poucasUnidades: number | null }[];
  imagens: { url: string; alt: string; variacaoId: string | null }[];
}

export function CompraProduto({ dados }: { dados: DadosCompra }) {
  const [estado, acao, pendente] = useActionState<Estado, FormData>(adicionarAoCarrinho, {});
  const { variacoes, imagens } = dados;

  const cores = useMemo(() => {
    const m = new Map<string, { slug: string; nome: string; hex: string | null }>();
    for (const v of variacoes) if (v.corSlug) m.set(v.corSlug, { slug: v.corSlug, nome: v.corNome!, hex: v.corHex });
    return [...m.values()];
  }, [variacoes]);
  const tamanhos = useMemo(() => [...new Set(variacoes.map((v) => v.tamanho).filter((t): t is string => !!t))], [variacoes]);

  const inicial = variacoes.find((v) => v.compravel) ?? variacoes[0];
  const [corSel, setCorSel] = useState<string | null>(inicial?.corSlug ?? null);
  const [tamSel, setTamSel] = useState<string | null>(inicial?.tamanho ?? null);
  const [qtd, setQtd] = useState(1);
  const [foto, setFoto] = useState(0);
  const [aviso, setAviso] = useState("");

  const achar = (cor: string | null, tam: string | null) => variacoes.find((v) => v.corSlug === cor && v.tamanho === tam);
  const atual = achar(corSel, tamSel) ?? variacoes.find((v) => v.corSlug === corSel) ?? variacoes[0];

  const escolherCor = (slug: string) => {
    const v = achar(slug, tamSel) ?? variacoes.find((x) => x.corSlug === slug && x.compravel) ?? variacoes.find((x) => x.corSlug === slug)!;
    setCorSel(slug); setTamSel(v.tamanho); trocou(v.id);
  };
  const escolherTamanho = (t: string) => {
    const v = achar(corSel, t) ?? variacoes.find((x) => x.tamanho === t && x.compravel) ?? variacoes.find((x) => x.tamanho === t)!;
    setTamSel(t); setCorSel(v.corSlug); trocou(v.id);
  };
  const trocou = (id: string) => {
    const v = variacoes.find((x) => x.id === id)!;
    setQtd((q) => Math.max(1, Math.min(q, v.quantidadeMaxima || 1)));
    const i = imagens.findIndex((im) => im.variacaoId === id);
    if (i >= 0) setFoto(i);
  };

  const max = atual?.quantidadeMaxima ?? 1;
  const podeComprar = !!atual?.compravel;
  const corDisponivel = (slug: string) => variacoes.some((v) => v.corSlug === slug && v.compravel);
  const tamDisponivel = (t: string) => variacoes.some((v) => v.tamanho === t && v.compravel);
  const imagem = imagens[foto] ?? imagens[0];

  async function compartilhar() {
    try {
      if (navigator.share) { await navigator.share({ title: dados.nome, url: dados.url }); return; }
      await navigator.clipboard.writeText(dados.url);
      setAviso("Link copiado!");
    } catch { setAviso("Não foi possível compartilhar. Copie o endereço da página."); }
  }

  const whatsapp = dados.whatsapp ? `https://wa.me/${dados.whatsapp}?text=${encodeURIComponent(`Olá! Tenho uma dúvida sobre "${dados.nome}": ${dados.url}`)}` : null;

  return (
    <div className="mt-6 grid gap-10 lg:grid-cols-2">
      <div>
        <div className="relative aspect-square w-full overflow-hidden rounded-[var(--radius-card)] bg-creme-profundo">
          {imagem ? <Image src={imagem.url} alt={imagem.alt} fill priority sizes="(min-width:1024px) 50vw, 100vw" className="object-cover" /> : <Image src="/brand/simbolo-transparente.webp" alt="" aria-hidden fill sizes="300px" className="object-contain p-[25%] opacity-25" />}
          <BotaoFavorito slug={dados.slug} nome={dados.nome} className="absolute right-3 top-3" />
        </div>
        {imagens.length > 1 && (
          <ul className="mt-3 flex flex-wrap gap-2" aria-label="Fotos do produto">
            {imagens.map((im, i) => (
              <li key={im.url}>
                <button type="button" onClick={() => setFoto(i)} aria-label={`Ver foto ${i + 1} de ${imagens.length}`} aria-current={foto === i} className={`relative block size-16 overflow-hidden rounded-lg border-2 sm:size-20 ${foto === i ? "border-terracota-escuro" : "border-transparent"}`}>
                  <Image src={im.url} alt="" fill sizes="80px" className="object-cover" />
                </button>
              </li>
            ))}
          </ul>
        )}
      </div>

      <form action={acao} className="space-y-6">
        <input type="hidden" name="variacaoId" value={atual?.id ?? ""} />
        <input type="hidden" name="quantidade" value={qtd} />
        <div>
          <h1 className="text-3xl tracking-wide sm:text-4xl">{dados.nome}</h1>
          {atual && <div className="mt-3"><Preco centavos={atual.precoCentavos} promocionalCentavos={atual.promocionalCentavos} grande /></div>}
          <p className="mt-2 text-sm text-marrom-suave">{atual ? textoPrazo(dados.tipo, atual.prazoDias) : ""}</p>
        </div>

        {cores.length > 0 && (
          <fieldset>
            <legend className="text-sm font-semibold">Cor: <span className="font-normal">{atual?.corNome}</span></legend>
            <div className="mt-2 flex flex-wrap gap-2">
              {cores.map((c) => (
                <label key={c.slug} className="relative">
                  <input type="radio" name="cor" value={c.slug} checked={corSel === c.slug} onChange={() => escolherCor(c.slug)} className="peer sr-only" />
                  <span title={`${c.nome}${corDisponivel(c.slug) ? "" : " (indisponível)"}`} className={`block size-11 cursor-pointer rounded-full border border-linha ring-offset-2 ring-offset-creme peer-checked:ring-2 peer-checked:ring-terracota-escuro peer-focus-visible:outline peer-focus-visible:outline-[3px] peer-focus-visible:outline-terracota-escuro ${corDisponivel(c.slug) ? "" : "opacity-40"}`} style={{ background: c.hex ?? "linear-gradient(135deg,#f4f1ee,#b9b2ab)" }} />
                  {!corDisponivel(c.slug) && <span aria-hidden className="pointer-events-none absolute inset-0 flex items-center justify-center text-lg text-marrom">╱</span>}
                  <span className="sr-only">{c.nome}{corDisponivel(c.slug) ? "" : " (indisponível)"}</span>
                </label>
              ))}
            </div>
          </fieldset>
        )}

        {tamanhos.length > 0 && (
          <fieldset>
            <legend className="text-sm font-semibold">Tamanho: <span className="font-normal">{atual?.tamanho}</span></legend>
            <div className="mt-2 flex flex-wrap gap-2">
              {tamanhos.map((t) => (
                <label key={t}>
                  <input type="radio" name="tamanho" value={t} checked={tamSel === t} onChange={() => escolherTamanho(t)} className="peer sr-only" />
                  <span className={`inline-flex min-h-11 min-w-11 cursor-pointer items-center justify-center rounded-full border px-4 text-sm peer-checked:border-terracota-escuro peer-checked:bg-terracota-escuro peer-checked:text-creme peer-focus-visible:outline peer-focus-visible:outline-[3px] peer-focus-visible:outline-terracota-escuro ${tamDisponivel(t) ? "border-marrom" : "border-linha text-marrom-suave line-through"}`}>{t}</span>
                </label>
              ))}
            </div>
          </fieldset>
        )}

        {dados.personalizavel && dados.opcoes.length > 0 && (
          <fieldset className="space-y-3">
            <legend className="text-sm font-semibold">Personalização</legend>
            {dados.opcoes.map((o) => (
              <div key={o.id}>
                <label htmlFor={`pers-${o.id}`} className="mb-1 block text-sm">{o.rotulo}{o.obrigatoria ? <span className="text-terracota-escuro"> *</span> : <span className="text-marrom-suave"> (opcional)</span>}</label>
                <input id={`pers-${o.id}`} name={`pers:${o.id}`} maxLength={o.maxCaracteres} required={o.obrigatoria} autoComplete="off" className="campo" />
                <p className="mt-1 text-xs text-marrom-suave">Até {o.maxCaracteres} caracteres. Confira a escrita: peças personalizadas podem não ter troca.</p>
              </div>
            ))}
          </fieldset>
        )}

        <div>
          <p id="qtd-l" className="text-sm font-semibold">Quantidade</p>
          <div role="group" aria-labelledby="qtd-l" className="mt-2 inline-flex items-center rounded-full border border-marrom">
            <button type="button" className="size-11 rounded-full text-lg hover:bg-creme-profundo disabled:text-marrom-suave" aria-label="Diminuir quantidade" disabled={qtd <= 1 || !podeComprar} onClick={() => setQtd(qtd - 1)}>−</button>
            <output className="w-10 text-center" aria-live="polite">{qtd}</output>
            <button type="button" className="size-11 rounded-full text-lg hover:bg-creme-profundo disabled:text-marrom-suave" aria-label="Aumentar quantidade" disabled={qtd >= max || !podeComprar} onClick={() => setQtd(qtd + 1)}>+</button>
          </div>
          {atual?.poucasUnidades && <p className="mt-2 text-sm text-terracota-escuro">{atual.poucasUnidades === 1 ? "Última unidade!" : `Restam só ${atual.poucasUnidades} unidades.`}</p>}
        </div>

        {podeComprar ? (
          <div className="flex flex-col gap-3 sm:flex-row">
            <button type="submit" name="intencao" value="comprar" disabled={pendente} className="btn btn-primary flex-1">{pendente ? "Enviando…" : "Comprar agora"}</button>
            <button type="submit" name="intencao" value="adicionar" disabled={pendente} className="btn btn-secondary flex-1">Adicionar ao carrinho</button>
          </div>
        ) : (
          <p role="status" className="rounded-lg border border-linha bg-creme-profundo px-4 py-3 text-sm">Esta opção está indisponível no momento. Escolha outra cor ou tamanho{whatsapp ? " ou fale com a gente" : ""}.</p>
        )}

        <div aria-live="polite" className="min-h-6 text-sm">
          {estado.erro && <p role="alert" className="text-erro">{estado.erro}</p>}
          {estado.ok && <p className="text-terracota-escuro">{estado.ok} <Link href="/carrinho" className="underline underline-offset-4">Ver carrinho</Link></p>}
        </div>


        <div className="flex flex-wrap items-center gap-x-5 gap-y-1 text-sm">
          {whatsapp && <a href={whatsapp} target="_blank" rel="noopener noreferrer" className="inline-flex min-h-11 items-center underline underline-offset-4">Tirar dúvidas pelo WhatsApp<span className="sr-only"> (abre em nova aba)</span></a>}
          <button type="button" onClick={compartilhar} className="inline-flex min-h-11 items-center underline underline-offset-4">Compartilhar</button>
          <span role="status" className="text-marrom-suave">{aviso}</span>
        </div>
      </form>
    </div>
  );
}
