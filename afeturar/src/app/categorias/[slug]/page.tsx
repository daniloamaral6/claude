import { notFound } from "next/navigation";
import { EmBreve } from "@/components/EmBreve";
import { categorias } from "@/lib/site";

export function generateStaticParams() {
  return categorias.map((c) => ({ slug: c.slug }));
}

export default async function Categoria({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const cat = categorias.find((c) => c.slug === slug);
  if (!cat) notFound();
  return <EmBreve titulo={cat.nome} texto="Os produtos desta categoria aparecerão aqui quando o catálogo for cadastrado." />;
}
