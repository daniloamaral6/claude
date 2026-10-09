import { lerImagem } from "@/server/armazenamento";

/** Entrega as fotos enviadas pelo painel. Só aceita nomes no padrão UUID.ext (sem navegar pastas). */
export async function GET(_req: Request, { params }: { params: Promise<{ nome: string }> }) {
  const { nome } = await params;
  const img = await lerImagem(nome);
  if (!img) return new Response("Não encontrado", { status: 404 });
  return new Response(new Uint8Array(img.dados), {
    headers: {
      "Content-Type": img.mime,
      "Cache-Control": "public, max-age=31536000, immutable",
      "X-Content-Type-Options": "nosniff",
      "Content-Security-Policy": "default-src 'none'; sandbox",
    },
  });
}
