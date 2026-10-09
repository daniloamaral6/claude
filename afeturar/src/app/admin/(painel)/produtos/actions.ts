"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { executar, type Estado } from "@/server/acao";
import { exigirPainel } from "@/server/auth";
import { ErroNegocio } from "@/server/categorias";
import { produtoDeFormData } from "@/server/formularios";
import { adicionarImagem, moverImagem, removerImagem } from "@/server/imagens";
import { atualizarProduto, criarProduto, removerProduto } from "@/server/produtos";

export async function salvarProduto(_: Estado, fd: FormData): Promise<Estado> {
  const u = await exigirPainel();
  const id = String(fd.get("id") ?? "");
  let destino: string | null = null;
  const estado = await executar(async () => {
    const entrada = produtoDeFormData(fd);
    if (id) {
      await atualizarProduto(id, entrada, u.id);
      destino = `/admin/produtos/${id}?salvo=${entrada.ativo ? "publicado" : "rascunho"}`;
    } else {
      destino = `/admin/produtos/${(await criarProduto(entrada, u.id)).id}?criado=1`;
    }
    revalidatePath("/admin/produtos");
  });
  // Redireciona para a própria página: o formulário é recriado com os dados salvos (variações novas já com id).
  if (destino) redirect(destino);
  return estado;
}

export async function excluirProduto(fd: FormData) {
  const u = await exigirPainel();
  const id = String(fd.get("id"));
  if (fd.get("confirmo") !== "on") redirect(`/admin/produtos/${id}?erro=${encodeURIComponent("Marque a confirmação para excluir.")}`);
  const r = await removerProduto(id, u.id);
  revalidatePath("/admin/produtos");
  redirect(r.excluido ? "/admin/produtos?excluido=1" : `/admin/produtos?despublicado=1`);
}

/** Ações de foto: em caso de erro, voltam à página com a mensagem (ErroNegocio é texto nosso, escapado pelo React). */
async function comRetorno(produtoId: string, fn: () => Promise<void>) {
  let erro: string | null = null;
  try { await fn(); } catch (e) {
    if (e instanceof ErroNegocio) erro = e.message;
    else { console.error(e); erro = "Não foi possível concluir a operação."; }
  }
  revalidatePath(`/admin/produtos/${produtoId}`);
  redirect(`/admin/produtos/${produtoId}${erro ? `?erro=${encodeURIComponent(erro)}` : ""}#fotos`);
}

export async function enviarFoto(fd: FormData) {
  const u = await exigirPainel();
  const produtoId = String(fd.get("produtoId"));
  await comRetorno(produtoId, async () => {
    const arq = fd.get("arquivo");
    if (!(arq instanceof File) || arq.size === 0) throw new ErroNegocio("Escolha uma imagem.");
    if (arq.size > 5 * 1024 * 1024) throw new ErroNegocio("A imagem passa de 5 MB.");
    await adicionarImagem(produtoId, Buffer.from(await arq.arrayBuffer()), String(fd.get("alt") ?? ""), String(fd.get("variacaoId") ?? "") || null, u.id);
  });
}

export async function excluirFoto(fd: FormData) {
  const u = await exigirPainel();
  await comRetorno(String(fd.get("produtoId")), () => removerImagem(String(fd.get("imagemId")), u.id));
}

export async function moverFoto(fd: FormData) {
  await exigirPainel();
  await comRetorno(String(fd.get("produtoId")), () => moverImagem(String(fd.get("imagemId")), fd.get("direcao") === "cima" ? -1 : 1));
}
