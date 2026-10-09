import type { Metadata } from "next";
import { CatalogoPagina } from "@/components/catalogo/CatalogoPagina";
import type { ParamsBusca } from "@/components/catalogo/filtros";

export const dynamic = "force-dynamic";
export const metadata: Metadata = { title: "Busca", robots: { index: false, follow: true } }; // resultados de busca não são indexados

export default async function Busca({ searchParams }: { searchParams: Promise<ParamsBusca> }) {
  const sp = await searchParams;
  const q = (Array.isArray(sp.q) ? sp.q[0] : sp.q)?.slice(0, 80).trim();
  return <CatalogoPagina titulo={q ? `Busca: ${q}` : "Busca"} basePath="/busca" searchParams={sp} mostrarBusca />;
}
