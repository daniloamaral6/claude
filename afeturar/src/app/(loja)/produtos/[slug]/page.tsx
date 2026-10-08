import { notFound } from "next/navigation";
import { PrototipoAviso } from "@/components/PrototipoAviso";
import { produtosExemplo } from "@/lib/exemplo";
import { ProdutoView } from "./ProdutoView";

export const dynamicParams = false;

export function generateStaticParams() {
  return produtosExemplo.map((p) => ({ slug: p.slug }));
}

export default async function Produto({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const p = produtosExemplo.find((x) => x.slug === slug);
  if (!p) notFound();
  const relacionados = produtosExemplo.filter((x) => x.slug !== p.slug).slice(0, 4);
  return (
    <>
      <PrototipoAviso />
      <ProdutoView p={p} relacionados={relacionados} />
    </>
  );
}
