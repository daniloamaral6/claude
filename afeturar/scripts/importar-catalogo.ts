/**
 * Importa o catálogo a partir da planilha modelo.
 *
 *   npm run catalogo:importar -- planilha.xlsx                       # SIMULA (não grava nada)
 *   npm run catalogo:importar -- planilha.xlsx --fotos ./fotos --aplicar --admin voce@exemplo.com
 *
 * Os produtos entram como RASCUNHO. Publicar é sempre um passo seu, no painel.
 */
import "dotenv/config";
import { processarLinhas } from "../src/server/importacao";
import { aplicarImportacao, carregarReferencias } from "../src/server/importacao-aplicar";
import { lerPlanilha } from "../src/server/importacao-xlsx";
import { db } from "../src/lib/db";

const args = process.argv.slice(2);
const arquivo = args.find((a) => !a.startsWith("--") && args[args.indexOf(a) - 1] !== "--fotos" && args[args.indexOf(a) - 1] !== "--admin");
const valor = (flag: string) => { const i = args.indexOf(flag); return i >= 0 ? args[i + 1] : undefined; };
const aplicar = args.includes("--aplicar");

async function main() {
  if (!arquivo) { console.error("Informe o caminho da planilha .xlsx"); process.exit(1); }
  const res = processarLinhas(await lerPlanilha(arquivo), await carregarReferencias());

  console.log(`\nProdutos válidos: ${res.produtos.length} | ignorados: ${res.ignorados.length} | com erro: ${new Set(res.erros.map((e) => e.produto)).size}`);
  for (const i of res.ignorados) console.log(`  – ignorado: ${i.produto} (linha ${i.linha}): ${i.motivo}`);
  if (res.erros.length) {
    console.log("\nERROS (corrija na planilha e rode de novo):");
    for (const e of res.erros) console.log(`  linha ${e.linha} · ${e.produto} · ${e.campo}: ${e.mensagem}`);
  }
  const porProduto = new Map<string, string[]>();
  for (const a of res.avisos) porProduto.set(a.produto, [...(porProduto.get(a.produto) ?? []), a.mensagem]);
  if (porProduto.size) { console.log("\nAvisos (não impedem a importação):"); for (const [p, m] of porProduto) console.log(`  ${p}: ${m.join(" | ")}`); }

  if (res.erros.length) process.exit(2);
  if (!aplicar) { console.log("\nSimulação concluída. Nada foi gravado. Acrescente --aplicar --admin <e-mail> para importar."); return; }

  const email = valor("--admin")?.toLowerCase();
  const admin = email ? await db.usuario.findUnique({ where: { email } }) : null;
  if (!admin || admin.papel !== "ADMIN") { console.error("Informe --admin com o e-mail de um administrador existente."); process.exit(1); }
  const rel = await aplicarImportacao(res, admin.id, valor("--fotos"));
  console.log(`\nCriados (rascunho): ${rel.criados.length} | já existiam: ${rel.jaExistiam.length} | cores criadas: ${rel.coresCriadas.join(", ") || "nenhuma"} | fotos: ${rel.fotosAdicionadas}`);
  for (const a of rel.avisos) console.log("  aviso:", a);
}

main().catch((e) => { console.error(e instanceof Error ? e.message : e); process.exit(1); }).finally(() => db.$disconnect());
