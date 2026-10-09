import { NextResponse } from "next/server";
import { produtosPorSlugs } from "@/server/catalogo";

/** Cartões dos produtos favoritados (a lista de favoritos fica no aparelho; aqui só buscamos os dados atuais). */
export async function GET(req: Request) {
  const slugs = (new URL(req.url).searchParams.get("slugs") ?? "").split(",").map((s) => s.trim()).filter((s) => /^[a-z0-9-]{1,100}$/.test(s)).slice(0, 60);
  const itens = await produtosPorSlugs(slugs);
  const ordem = new Map(slugs.map((s, i) => [s, i]));
  itens.sort((a, b) => (ordem.get(a.slug) ?? 0) - (ordem.get(b.slug) ?? 0));
  return NextResponse.json({ itens }, { headers: { "Cache-Control": "no-store" } });
}
