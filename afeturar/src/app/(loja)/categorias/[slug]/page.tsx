import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { CatalogoPagina } from "@/components/catalogo/CatalogoPagina";
import { temFiltro, type ParamsBusca } from "@/components/catalogo/filtros";
import { site } from "@/lib/site";
import { categoriaPorSlug } from "@/server/catalogo";

export const dynamic = "force-dynamic";
type Props = { params: Promise<{ slug: string }>; searchParams: Promise<ParamsBusca> };

export async function generateMetadata({ params, searchParams }: Props): Promise<Metadata> {
  const cat = await categoriaPorSlug((await params).slug);
  if (!cat) return {};
  return {
    title: cat.nome, description: cat.descricao ?? `${cat.nome} na Afeturar. ${site.slogan}`,
    alternates: { canonical: `/categorias/${cat.slug}` },
    robots: temFiltro(await searchParams) ? { index: false, follow: true } : undefined, // páginas filtradas não entram no Google
  };
}

export default async function Categoria({ params, searchParams }: Props) {
  const cat = await categoriaPorSlug((await params).slug);
  if (!cat) notFound();
  return (
    <CatalogoPagina
      titulo={cat.nome} basePath={`/categorias/${cat.slug}`} searchParams={await searchParams} categoriaSlug={cat.slug}
      descricao={cat.descricao} subcategorias={cat.filhas} migalhas={cat.pai ? [{ href: `/categorias/${cat.pai.slug}`, nome: cat.pai.nome }] : []}
    />
  );
}
