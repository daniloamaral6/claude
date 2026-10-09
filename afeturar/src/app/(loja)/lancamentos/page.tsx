import type { Metadata } from "next";
import { CatalogoPagina } from "@/components/catalogo/CatalogoPagina";
import { temFiltro, type ParamsBusca } from "@/components/catalogo/filtros";

export const dynamic = "force-dynamic";
export async function generateMetadata({ searchParams }: { searchParams: Promise<ParamsBusca> }): Promise<Metadata> {
  return { title: "Novidades", description: "Os lançamentos mais recentes da Afeturar.", alternates: { canonical: "/lancamentos" }, robots: temFiltro(await searchParams) ? { index: false, follow: true } : undefined };
}
export default async function Novidades({ searchParams }: { searchParams: Promise<ParamsBusca> }) {
  return <CatalogoPagina titulo="Novidades" basePath="/lancamentos" searchParams={await searchParams} ordemPadrao="novidades" />;
}
