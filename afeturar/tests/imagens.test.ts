import { afterAll, beforeEach, describe, expect, it } from "vitest";
import { lerImagem, salvarImagem, detectarTipo, LIMITE_BYTES } from "../src/server/armazenamento";
import { adicionarImagem, moverImagem, removerImagem, MAX_IMAGENS_POR_PRODUTO } from "../src/server/imagens";
import { criarProdutoBase, limparBanco, prisma } from "./helpers";

const png = Buffer.concat([Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]), Buffer.alloc(32)]);
const jpg = Buffer.concat([Buffer.from([0xff, 0xd8, 0xff, 0xe0]), Buffer.alloc(32)]);
const webp = Buffer.concat([Buffer.from("RIFF"), Buffer.alloc(4), Buffer.from("WEBP"), Buffer.alloc(16)]);

beforeEach(limparBanco);
afterAll(() => prisma.$disconnect());

describe("armazenamento", () => {
  it("identifica o tipo pelo conteúdo", () => {
    expect(detectarTipo(png)).toBe("png");
    expect(detectarTipo(jpg)).toBe("jpg");
    expect(detectarTipo(webp)).toBe("webp");
  });

  it("recusa SVG, HTML, executáveis, vazios e arquivos grandes", async () => {
    for (const ruim of [Buffer.from("<svg onload=alert(1)></svg>"), Buffer.from("<html><script>1</script></html>"), Buffer.from("MZ\x90\x00"), Buffer.alloc(0)])
      await expect(salvarImagem(ruim)).rejects.toThrow();
    await expect(salvarImagem(Buffer.concat([jpg, Buffer.alloc(LIMITE_BYTES)]))).rejects.toThrow(/5 MB/);
  });

  it("salva com nome aleatório e devolve o mesmo conteúdo", async () => {
    const { nome, url } = await salvarImagem(png);
    expect(url).toBe(`/media/${nome}`);
    expect(nome).toMatch(/^[0-9a-f-]{36}\.png$/);
    const lida = await lerImagem(nome);
    expect(lida?.mime).toBe("image/png");
    expect(lida?.dados.equals(png)).toBe(true);
  });

  it("bloqueia tentativas de sair da pasta (path traversal)", async () => {
    for (const nome of ["../../etc/passwd", "..%2f..%2fetc%2fpasswd", "a.png", "/etc/passwd", "x.svg", "00000000-0000-0000-0000-000000000000.html"])
      expect(await lerImagem(nome)).toBeNull();
  });
});

describe("fotos do produto", () => {
  it("adiciona, ordena, troca a ordem e remove", async () => {
    const autor = await prisma.usuario.create({ data: { email: "a@a.com", papel: "ADMIN" } });
    const p = await criarProdutoBase();
    const a = await adicionarImagem(p.id, png, "", null, autor.id);
    const b = await adicionarImagem(p.id, jpg, "Vista lateral", null, autor.id);
    expect(a.alt).toBe(p.nome); // texto alternativo padrão
    expect(b.alt).toBe("Vista lateral");
    expect([a.ordem, b.ordem]).toEqual([0, 1]);
    await moverImagem(b.id, -1);
    const ordem = (await prisma.produtoImagem.findMany({ orderBy: { ordem: "asc" } })).map((i) => i.id);
    expect(ordem).toEqual([b.id, a.id]);
    await removerImagem(a.id, autor.id);
    expect(await prisma.produtoImagem.count()).toBe(1);
  });

  it("respeita o limite por produto e não deixa produto publicado sem foto", async () => {
    const autor = await prisma.usuario.create({ data: { email: "a@a.com", papel: "ADMIN" } });
    const p = await criarProdutoBase();
    for (let i = 0; i < MAX_IMAGENS_POR_PRODUTO; i++) await adicionarImagem(p.id, png, "", null, autor.id);
    await expect(adicionarImagem(p.id, png, "", null, autor.id)).rejects.toThrow(/Limite/);
    const q = await criarProdutoBase({ ativo: true });
    const img = await adicionarImagem(q.id, png, "", null, autor.id);
    await expect(removerImagem(img.id, autor.id)).rejects.toThrow(/publicado/);
  });
});
