import { ZodError } from "zod";
import { ErroNegocio } from "./categorias";
import { errosDoZod } from "./formularios";

export type Estado = { erro?: string; erros?: Record<string, string>; ok?: string };

/** Executa uma ação do painel e converte erros em mensagens para o formulário (sem vazar detalhes internos). */
export async function executar(fn: () => Promise<string | void>): Promise<Estado> {
  try {
    const ok = await fn();
    return ok ? { ok } : {};
  } catch (e) {
    if (e instanceof ZodError) return { erro: "Corrija os campos destacados.", erros: errosDoZod(e.issues) };
    if (e instanceof ErroNegocio) return { erro: e.message };
    if (e instanceof Error && "digest" in e && String((e as { digest?: string }).digest).startsWith("NEXT_REDIRECT")) throw e;
    console.error("Erro inesperado no painel:", e);
    return { erro: "Não foi possível concluir. Tente novamente; se persistir, avise o suporte." };
  }
}
