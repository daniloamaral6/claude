import { notFound } from "next/navigation";
import { PrototipoAviso } from "@/components/PrototipoAviso";
import { categorias } from "@/lib/site";
import { CatalogoView } from "./CatalogoView";

export function generateStaticParams() {
  return categorias.map((c) => ({ slug: c.slug }));
}

export default async function Categoria({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const cat = categorias.find((c) => c.slug === slug);
  if (!cat) notFound();
  return (
    <>
      <PrototipoAviso />
      <CatalogoView categoriaSlug={cat.slug} categoriaNome={cat.nome} />
    </>
  );
}
