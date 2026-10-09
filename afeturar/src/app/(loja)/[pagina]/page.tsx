import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { EmBreve } from "@/components/EmBreve";
import { db } from "@/lib/db";

export const dynamic = "force-dynamic";

/** Slugs de páginas institucionais aceitas (as demais rotas dão 404). */
const permitidas = new Set(["sobre", "fale-conosco", "perguntas-frequentes", "acompanhar-pedido", "politica-de-privacidade", "termos-de-uso", "trocas-e-devolucoes", "politica-de-entrega"]);

async function buscar(slug: string) {
  if (!permitidas.has(slug)) return null;
  return db.paginaInstitucional.findUnique({ where: { slug } });
}

export async function generateMetadata({ params }: { params: Promise<{ pagina: string }> }): Promise<Metadata> {
  const p = await buscar((await params).pagina);
  return p ? { title: p.titulo, alternates: { canonical: `/${p.slug}` }, robots: p.publicada ? undefined : { index: false, follow: false } } : {};
}

export default async function Pagina({ params }: { params: Promise<{ pagina: string }> }) {
  const p = await buscar((await params).pagina);
  if (!p) notFound();
  if (!p.publicada || !p.conteudo.trim()) return <EmBreve titulo={p.titulo} />;
  // Conteúdo em texto simples: parágrafos separados por linha em branco (nunca HTML bruto).
  const paragrafos = p.conteudo.split(/\n{2,}/).map((t) => t.trim()).filter(Boolean);
  return (
    <article className="container-loja max-w-3xl py-10 sm:py-14">
      <h1 className="text-3xl tracking-wide sm:text-4xl">{p.titulo}</h1>
      <div className="mt-6 space-y-4 leading-relaxed">{paragrafos.map((t, i) => <p key={i} className="whitespace-pre-line">{t}</p>)}</div>
    </article>
  );
}
