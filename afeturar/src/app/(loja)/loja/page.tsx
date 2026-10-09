import type { Metadata } from "next";
import { CatalogoPagina } from "@/components/catalogo/CatalogoPagina";
import { temFiltro, type ParamsBusca } from "@/components/catalogo/filtros";

export const dynamic = "force-dynamic";
export async function generateMetadata({ searchParams }: { searchParams: Promise<ParamsBusca> }): Promise<Metadata> {
  return { title: "Loja", description: "Todos os produtos da Afeturar.", alternates: { canonical: "/loja" }, robots: temFiltro(await searchParams) ? { index: false, follow: true } : undefined };
}
export default async function Loja({ searchParams }: { searchParams: Promise<ParamsBusca> }) {
  return <CatalogoPagina titulo="Loja" basePath="/loja" searchParams={await searchParams} />;
}
