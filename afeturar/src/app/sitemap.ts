import type { MetadataRoute } from "next";
import { db } from "@/lib/db";
import { site } from "@/lib/site";

export const dynamic = "force-dynamic";

/** Só URLs públicas: produtos publicados, categorias ativas e páginas institucionais publicadas. */
export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const [produtos, categorias, paginas] = await Promise.all([
    db.produto.findMany({ where: { ativo: true, variacoes: { some: { ativa: true } }, categoria: { ativa: true } }, select: { slug: true, atualizadoEm: true } }),
    db.categoria.findMany({ where: { ativa: true }, select: { slug: true, atualizadoEm: true } }),
    db.paginaInstitucional.findMany({ where: { publicada: true }, select: { slug: true, atualizadoEm: true } }),
  ]);
  return [
    { url: `${site.url}/`, changeFrequency: "daily", priority: 1 },
    { url: `${site.url}/loja`, changeFrequency: "daily", priority: 0.9 },
    { url: `${site.url}/lancamentos`, changeFrequency: "daily", priority: 0.7 },
    ...categorias.map((c) => ({ url: `${site.url}/categorias/${c.slug}`, lastModified: c.atualizadoEm, changeFrequency: "weekly" as const, priority: 0.8 })),
    ...produtos.map((p) => ({ url: `${site.url}/produtos/${p.slug}`, lastModified: p.atualizadoEm, changeFrequency: "weekly" as const, priority: 0.7 })),
    ...paginas.map((p) => ({ url: `${site.url}/${p.slug}`, lastModified: p.atualizadoEm, priority: 0.3 })),
  ];
}
