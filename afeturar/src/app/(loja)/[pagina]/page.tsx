import { notFound } from "next/navigation";
import { EmBreve } from "@/components/EmBreve";

/** Páginas institucionais. O conteúdo definitivo (textos jurídicos, dados da empresa) será fornecido/validado antes da publicação. */
const paginas: Record<string, string> = {
  sobre: "Sobre a Afeturar",
  "fale-conosco": "Fale conosco",
  "perguntas-frequentes": "Perguntas frequentes",
  "acompanhar-pedido": "Acompanhar pedido",
  "politica-de-privacidade": "Política de privacidade",
  "termos-de-uso": "Termos de uso",
  "trocas-e-devolucoes": "Trocas e devoluções",
  "politica-de-entrega": "Política de entrega",
};

export const dynamicParams = false;

export function generateStaticParams() {
  return Object.keys(paginas).map((pagina) => ({ pagina }));
}

export default async function Pagina({ params }: { params: Promise<{ pagina: string }> }) {
  const { pagina } = await params;
  const titulo = paginas[pagina];
  if (!titulo) notFound();
  return <EmBreve titulo={titulo} />;
}
