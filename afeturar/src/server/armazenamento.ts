import { randomUUID } from "node:crypto";
import { mkdir, readFile, unlink, writeFile } from "node:fs/promises";
import path from "node:path";
import { ErroNegocio } from "./categorias";

/**
 * Armazenamento de imagens. Hoje: disco local (desenvolvimento). Em produção troque por um
 * serviço de objetos (Cloudflare R2 / Cloudinary) mantendo esta mesma interface.
 */
export const LIMITE_BYTES = 5 * 1024 * 1024;
const DIR = () => path.resolve(process.env.STORAGE_DIR ?? "storage/uploads");

const tipos = {
  jpg: { mime: "image/jpeg", confere: (b: Buffer) => b[0] === 0xff && b[1] === 0xd8 && b[2] === 0xff },
  png: { mime: "image/png", confere: (b: Buffer) => b.subarray(0, 8).equals(Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a])) },
  webp: { mime: "image/webp", confere: (b: Buffer) => b.subarray(0, 4).toString("ascii") === "RIFF" && b.subarray(8, 12).toString("ascii") === "WEBP" },
} as const;
type Extensao = keyof typeof tipos;

/** Identifica o tipo pelo CONTEÚDO (não confia no nome nem no Content-Type enviado). */
export function detectarTipo(buf: Buffer): Extensao | null {
  return (Object.keys(tipos) as Extensao[]).find((e) => tipos[e].confere(buf)) ?? null;
}

export async function salvarImagem(buf: Buffer) {
  if (buf.length === 0) throw new ErroNegocio("Arquivo vazio.");
  if (buf.length > LIMITE_BYTES) throw new ErroNegocio("A imagem passa de 5 MB. Reduza o tamanho e tente de novo.");
  const ext = detectarTipo(buf);
  if (!ext) throw new ErroNegocio("Formato não aceito. Envie JPG, PNG ou WebP.");
  const nome = `${randomUUID()}.${ext}`;
  await mkdir(DIR(), { recursive: true });
  await writeFile(path.join(DIR(), nome), buf, { flag: "wx" });
  return { nome, url: `/media/${nome}` };
}

export const NOME_VALIDO = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}\.(jpg|png|webp)$/;

export async function lerImagem(nome: string) {
  if (!NOME_VALIDO.test(nome)) return null; // bloqueia ../ e qualquer nome fora do padrão
  try {
    const dados = await readFile(path.join(DIR(), nome));
    return { dados, mime: tipos[nome.split(".")[1] as Extensao].mime };
  } catch {
    return null;
  }
}

export async function apagarImagem(url: string) {
  const nome = url.replace(/^\/media\//, "");
  if (!NOME_VALIDO.test(nome)) return;
  await unlink(path.join(DIR(), nome)).catch(() => {});
}
