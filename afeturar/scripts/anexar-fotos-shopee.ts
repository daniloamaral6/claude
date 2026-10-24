/**
 * Anexa aos rascunhos já importados as fotos baixadas da Shopee.
 *
 *   npx tsx scripts/anexar-fotos-shopee.ts produtos.json storage/fotos-shopee                       # SIMULA
 *   npx tsx scripts/anexar-fotos-shopee.ts produtos.json storage/fotos-shopee --aplicar --admin voce@exemplo.com
 *
 * - Fotos da galeria entram na ordem do anúncio (a primeira é a capa).
 * - A foto de cada cor entra ligada à primeira variação daquela cor (a loja troca a foto ao escolher a cor).
 * - Produto que já tem fotos é pulado (pode rodar de novo sem duplicar). Nada é publicado.
 */
import "dotenv/config";
import { readFile } from "node:fs/promises";
import path from "node:path";
import { db } from "../src/lib/db";
import { adicionarImagem } from "../src/server/imagens";
import { normalizar } from "../src/server/importacao";

interface Opcao { nome: string; arquivo?: string }
interface Produto { nome: string; fotos: { arquivo: string }[]; variacoes: { nome: string; opcoes: Opcao[] }[] }

const chave = (s: string) => normalizar(s).replace(/[/]/g, " ").replace(/\s+/g, " ").trim();
const args = process.argv.slice(2);
const [jsonPath, pasta] = args.filter((a) => !a.startsWith("--") && args[args.indexOf(a) - 1] !== "--admin");
const aplicar = args.includes("--aplicar");
const adminEmail = args[args.indexOf("--admin") + 1]?.toLowerCase();

async function main() {
  if (!jsonPath || !pasta) { console.error("Uso: anexar-fotos-shopee.ts produtos.json pasta-das-fotos [--aplicar --admin email]"); process.exit(1); }
  const dados = JSON.parse(await readFile(jsonPath, "utf-8")).produtos as Produto[];
  const admin = aplicar && adminEmail ? await db.usuario.findUnique({ where: { email: adminEmail } }) : null;
  if (aplicar && (!admin || admin.papel !== "ADMIN")) { console.error("Informe --admin com o e-mail de um administrador existente."); process.exit(1); }

  const noBanco = await db.produto.findMany({ include: { imagens: { select: { id: true } }, variacoes: { include: { cor: true }, orderBy: { sku: "asc" } } } });
  let total = 0;
  for (const p of dados) {
    const alvo = noBanco.find((x) => chave(x.nome) === chave(p.nome.split(" | ")[0]));
    if (!alvo) { console.log(`- ${p.nome}: não encontrado no banco (importe o catálogo antes).`); continue; }
    if (alvo.imagens.length) { console.log(`- ${alvo.nome}: já tem ${alvo.imagens.length} foto(s); pulado.`); continue; }

    const fila: { arquivo: string; variacaoId: string | null; alt: string }[] = p.fotos.map((f) => ({ arquivo: f.arquivo, variacaoId: null, alt: "" }));
    const jaLigadas = new Set<string>();
    for (const eixo of p.variacoes.filter((v) => v.nome === "Cor")) {
      for (const o of eixo.opcoes) {
        if (!o.arquivo) continue;
        const v = alvo.variacoes.find((x) => x.cor && chave(x.cor.nome) === chave(o.nome) && !jaLigadas.has(x.corId ?? ""));
        if (!v) continue;
        jaLigadas.add(v.corId ?? "");
        fila.push({ arquivo: o.arquivo, variacaoId: v.id, alt: `${alvo.nome} — ${v.cor?.nome}` });
      }
    }
    console.log(`- ${alvo.nome}: ${fila.length} foto(s) (${p.fotos.length} da galeria, ${fila.length - p.fotos.length} de cores)`);
    if (!aplicar) continue;
    for (const f of fila) {
      try { await adicionarImagem(alvo.id, await readFile(path.join(pasta, f.arquivo)), f.alt, f.variacaoId, admin!.id); total++; }
      catch (e) { console.log(`    aviso: ${f.arquivo}: ${e instanceof Error ? e.message : e}`); }
    }
  }
  console.log(aplicar ? `\nFotos adicionadas: ${total}` : "\nSimulação: nada foi gravado. Acrescente --aplicar --admin <e-mail>.");
}
main().catch((e) => { console.error(e); process.exit(1); }).finally(() => db.$disconnect());
