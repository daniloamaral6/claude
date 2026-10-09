import type { MetadataRoute } from "next";
import { site } from "@/lib/site";

/** Enquanto NEXT_PUBLIC_INDEXAR != "true" (ambiente de testes), bloqueia todos os buscadores. */
export default function robots(): MetadataRoute.Robots {
  if (process.env.NEXT_PUBLIC_INDEXAR !== "true") return { rules: { userAgent: "*", disallow: "/" } };
  return { rules: { userAgent: "*", allow: "/", disallow: ["/admin", "/api", "/carrinho", "/checkout", "/conta", "/favoritos", "/busca", "/media/"] }, sitemap: `${site.url}/sitemap.xml` };
}
