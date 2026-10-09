import { formatarBRL } from "@/lib/moeda";
import { site } from "@/lib/site";
import type { Email } from "./index";

const esc = (s: unknown) => String(s ?? "").replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]!);
const moldura = (titulo: string, corpoHtml: string) => `<!doctype html><html lang="pt-BR"><body style="margin:0;background:#fdf6ee;font-family:Arial,sans-serif;color:#4a2712"><div style="max-width:560px;margin:0 auto;padding:24px"><h1 style="font-size:20px;font-weight:400;letter-spacing:.05em">${esc(site.nome.toUpperCase())}</h1><h2 style="font-size:18px">${esc(titulo)}</h2>${corpoHtml}<hr style="border:none;border-top:1px solid #e6d3c2;margin:24px 0"><p style="font-size:12px;color:#7a5a47">${esc(site.slogan)}</p></div></body></html>`;
const botao = (href: string, rotulo: string) => `<p><a href="${esc(href)}" style="display:inline-block;background:#894128;color:#fdf6ee;padding:12px 24px;border-radius:24px;text-decoration:none">${esc(rotulo)}</a></p>`;

export interface PedidoEmail {
  numero: number; nome: string; email: string; totalCentavos: number; subtotalCentavos: number; descontoCentavos: number; freteCentavos: number; tokenAcesso: string;
  codigoRastreio?: string | null; freteServico?: string | null;
  itens: { nomeProduto: string; quantidade: number; precoUnitarioCentavos: number; corNome?: string | null; tamanho?: string | null }[];
}
export const linkDoPedido = (p: Pick<PedidoEmail, "numero" | "tokenAcesso">) => `${site.url}/pedido/${p.numero}?c=${p.tokenAcesso}`;
const primeiroNome = (n: string) => n.trim().split(/\s+/)[0] || "";
const resumo = (p: PedidoEmail) => ({
  texto: [...p.itens.map((i) => `${i.quantidade}x ${i.nomeProduto}${i.corNome ? ` (${i.corNome})` : ""} — ${formatarBRL(i.precoUnitarioCentavos * i.quantidade)}`), `Frete: ${formatarBRL(p.freteCentavos)}`, `Total: ${formatarBRL(p.totalCentavos)}`].join("\n"),
  html: `<ul style="padding-left:18px">${p.itens.map((i) => `<li>${i.quantidade}× ${esc(i.nomeProduto)}${i.corNome ? ` (${esc(i.corNome)})` : ""} — ${formatarBRL(i.precoUnitarioCentavos * i.quantidade)}</li>`).join("")}</ul><p>Frete: ${formatarBRL(p.freteCentavos)}<br><strong>Total: ${formatarBRL(p.totalCentavos)}</strong></p>`,
});

export function emailPedidoRecebido(p: PedidoEmail, metodo: "PIX" | "CARTAO"): Email {
  const r = resumo(p), link = linkDoPedido(p);
  const aviso = metodo === "PIX" ? "Para concluir, pague o Pix pela página do pedido (o código expira em pouco tempo)." : "Estamos confirmando o pagamento do seu cartão.";
  return { para: p.email, assunto: `Recebemos seu pedido #${p.numero}`, texto: `Olá, ${primeiroNome(p.nome)}!\n\nRecebemos seu pedido #${p.numero}.\n${aviso}\n\n${r.texto}\n\nAcompanhe: ${link}\n\n${site.slogan}`, html: moldura(`Recebemos seu pedido #${p.numero}`, `<p>Olá, ${esc(primeiroNome(p.nome))}!</p><p>${esc(aviso)}</p>${r.html}${botao(link, "Ver meu pedido")}`) };
}
export function emailPagamentoAprovado(p: PedidoEmail): Email {
  const link = linkDoPedido(p);
  return { para: p.email, assunto: `Pagamento aprovado — pedido #${p.numero}`, texto: `Olá, ${primeiroNome(p.nome)}!\n\nO pagamento do pedido #${p.numero} foi aprovado. Já estamos preparando tudo com carinho.\n\nAcompanhe: ${link}`, html: moldura(`Pagamento aprovado — pedido #${p.numero}`, `<p>Olá, ${esc(primeiroNome(p.nome))}!</p><p>O pagamento foi aprovado. Já estamos preparando tudo com carinho.</p>${botao(link, "Acompanhar pedido")}`) };
}
export function emailPedidoEnviado(p: PedidoEmail): Email {
  const link = linkDoPedido(p);
  const rast = p.codigoRastreio ? `Código de rastreio: ${p.codigoRastreio}` : "";
  return { para: p.email, assunto: `Seu pedido #${p.numero} foi enviado`, texto: `Olá, ${primeiroNome(p.nome)}!\n\nSeu pedido #${p.numero} foi enviado${p.freteServico ? ` (${p.freteServico})` : ""}.\n${rast}\n\nAcompanhe: ${link}`, html: moldura(`Seu pedido #${p.numero} foi enviado`, `<p>Olá, ${esc(primeiroNome(p.nome))}!</p><p>Seu pedido saiu para entrega${p.freteServico ? ` (${esc(p.freteServico)})` : ""}.</p>${p.codigoRastreio ? `<p>Código de rastreio: <strong>${esc(p.codigoRastreio)}</strong></p>` : ""}${botao(link, "Acompanhar pedido")}`) };
}
export function emailPedidoCancelado(p: PedidoEmail, motivo: string): Email {
  return { para: p.email, assunto: `Pedido #${p.numero} cancelado`, texto: `Olá, ${primeiroNome(p.nome)}!\n\nSeu pedido #${p.numero} foi cancelado. ${motivo}\n\nSe tiver dúvidas, responda este e-mail.`, html: moldura(`Pedido #${p.numero} cancelado`, `<p>Olá, ${esc(primeiroNome(p.nome))}!</p><p>${esc(motivo)}</p><p>Se tiver dúvidas, responda este e-mail.</p>`) };
}
export function emailRecuperarSenha(para: string, nome: string | null, link: string): Email {
  return { para, assunto: "Redefinir sua senha", texto: `Olá${nome ? `, ${primeiroNome(nome)}` : ""}!\n\nPara criar uma nova senha, acesse (vale por 1 hora):\n${link}\n\nSe você não pediu, ignore este e-mail.`, html: moldura("Redefinir sua senha", `<p>Para criar uma nova senha, clique abaixo (vale por 1 hora).</p>${botao(link, "Criar nova senha")}<p style="font-size:12px">Se você não pediu, ignore este e-mail.</p>`) };
}
