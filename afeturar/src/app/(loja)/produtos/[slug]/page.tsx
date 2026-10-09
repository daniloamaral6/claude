import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ProdutoCard } from "@/components/ProdutoCard";
import { site } from "@/lib/site";
import { obterProdutoPublico, relacionados } from "@/server/catalogo";
import { configuracoesPublicas } from "@/server/loja-config";
import { CompraProduto, type DadosCompra } from "./CompraProduto";

export const dynamic = "force-dynamic";
type Props = { params: Promise<{ slug: string }> };

const cortar = (s: string, n: number) => (s.length > n ? `${s.slice(0, n - 1).trimEnd()}…` : s);
const absoluta = (u: string) => (u.startsWith("http") ? u : `${site.url}${u}`);

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const p = await obterProdutoPublico((await params).slug);
  if (!p) return {};
  const descricao = p.seoDescricao ?? (p.descricao ? cortar(p.descricao.replace(/\s+/g, " "), 155) : `${p.nome} na Afeturar. ${site.slogan}`);
  const imagem = p.imagens[0] ? absoluta(p.imagens[0].url) : undefined;
  return {
    title: p.seoTitulo ?? p.nome, description: descricao, alternates: { canonical: `/produtos/${p.slug}` },
    openGraph: { title: p.seoTitulo ?? p.nome, description: descricao, url: `${site.url}/produtos/${p.slug}`, siteName: site.nome, locale: "pt_BR", type: "website", images: imagem ? [{ url: imagem, alt: p.imagens[0].alt }] : undefined },
    twitter: { card: imagem ? "summary_large_image" : "summary", title: p.seoTitulo ?? p.nome, description: descricao, images: imagem ? [imagem] : undefined },
  };
}

const cm = (mm: number) => (mm / 10).toLocaleString("pt-BR", { maximumFractionDigits: 1 });

export default async function Produto({ params }: Props) {
  const p = await obterProdutoPublico((await params).slug);
  if (!p) notFound();
  const [rel, config] = await Promise.all([relacionados(p.id, p.categoria.id, 4), configuracoesPublicas()]);
  const url = `${site.url}/produtos/${p.slug}`;

  const dados: DadosCompra = {
    nome: p.nome, url, tipo: p.tipo, personalizavel: p.personalizavel, whatsapp: config.whatsapp,
    opcoes: p.opcoesPersonalizacao.map((o) => ({ id: o.id, rotulo: o.rotulo, obrigatoria: o.obrigatoria, maxCaracteres: o.maxCaracteres })),
    variacoes: p.variacoes.map((v) => ({ id: v.id, corSlug: v.cor?.slug ?? null, corNome: v.cor?.nome ?? null, corHex: v.cor?.hex ?? null, tamanho: v.tamanho, precoCentavos: v.precoCentavos, promocionalCentavos: v.promocionalCentavos, compravel: v.compravel, quantidadeMaxima: v.quantidadeMaxima, prazoDias: v.prazoDias, poucasUnidades: v.poucasUnidades })),
    imagens: p.imagens.map((i) => ({ url: i.url, alt: i.alt, variacaoId: i.variacaoId })),
    slug: p.slug,
  };

  // Dados estruturados (Google): só informações cadastradas.
  const precos = p.variacoes.map((v) => v.finalCentavos);
  const disponivel = p.variacoes.some((v) => v.compravel);
  const base = { "@type": "Offer", priceCurrency: "BRL", availability: `https://schema.org/${disponivel ? "InStock" : "OutOfStock"}`, itemCondition: "https://schema.org/NewCondition", url };
  const jsonLd = {
    "@context": "https://schema.org", "@type": "Product", name: p.nome, description: p.descricao ?? undefined, sku: p.variacoes[0]?.sku,
    image: p.imagens.map((i) => absoluta(i.url)), brand: { "@type": "Brand", name: site.nome }, category: p.categoria.nome, material: p.material ?? undefined,
    offers: precos.length > 1 && Math.min(...precos) !== Math.max(...precos)
      ? { "@type": "AggregateOffer", priceCurrency: "BRL", lowPrice: (Math.min(...precos) / 100).toFixed(2), highPrice: (Math.max(...precos) / 100).toFixed(2), offerCount: precos.length, availability: base.availability }
      : { ...base, price: ((precos[0] ?? p.precoCentavos) / 100).toFixed(2) },
  };

  const medidas = [["Largura", p.larguraMm], ["Altura", p.alturaMm], ["Profundidade", p.profundidadeMm]].filter(([, v]) => v) as [string, number][];

  return (
    <div className="container-loja py-8 sm:py-12">
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd).replace(/</g, "\\u003c") }} />
      <nav aria-label="Você está em" className="text-sm text-marrom-suave">
        <Link href="/" className="underline-offset-4 hover:underline">Início</Link>
        {p.categoria.pai && <span> <span aria-hidden>/</span> <Link href={`/categorias/${p.categoria.pai.slug}`} className="underline-offset-4 hover:underline">{p.categoria.pai.nome}</Link></span>}
        <span aria-hidden> /</span> <Link href={`/categorias/${p.categoria.slug}`} className="underline-offset-4 hover:underline">{p.categoria.nome}</Link>
        <span aria-hidden> /</span> <span aria-current="page">{p.nome}</span>
      </nav>

      <CompraProduto dados={dados} />

      {(p.descricao || p.caracteristicas.length > 0 || medidas.length > 0 || p.material || p.cuidados) && (
        <section aria-label="Detalhes do produto" className="mt-14 grid gap-8 border-t border-linha pt-10 md:grid-cols-3">
          {p.descricao && <div><h2 className="text-xl">Descrição</h2><p className="mt-2 whitespace-pre-line text-sm leading-relaxed text-marrom-suave">{p.descricao}</p></div>}
          {p.caracteristicas.length > 0 && <div><h2 className="text-xl">Características e benefícios</h2><ul className="mt-2 list-disc space-y-1 pl-5 text-sm text-marrom-suave">{p.caracteristicas.map((c) => <li key={c}>{c}</li>)}</ul></div>}
          {(medidas.length > 0 || p.material || p.cuidados) && (
            <div>
              <h2 className="text-xl">Medidas e cuidados</h2>
              <dl className="mt-2 space-y-1 text-sm text-marrom-suave">
                {medidas.map(([rotulo, mm]) => <div key={rotulo} className="flex gap-2"><dt className="font-medium text-marrom">{rotulo}:</dt><dd>{cm(mm)} cm</dd></div>)}
                {p.material && <div className="flex gap-2"><dt className="font-medium text-marrom">Material:</dt><dd>{p.material}</dd></div>}
                {p.cuidados && <div className="flex gap-2"><dt className="font-medium text-marrom">Cuidados:</dt><dd>{p.cuidados}</dd></div>}
              </dl>
            </div>
          )}
        </section>
      )}

      {rel.length > 0 && (
        <section aria-labelledby="rel-t" className="mt-14">
          <h2 id="rel-t" className="text-2xl sm:text-3xl">Você também pode gostar</h2>
          <ul className="mt-6 grid grid-cols-2 gap-x-4 gap-y-8 md:grid-cols-4">{rel.map((r) => <li key={r.id}><ProdutoCard p={r} /></li>)}</ul>
        </section>
      )}
    </div>
  );
}
