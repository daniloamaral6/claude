import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { lerCarrinho } from "@/server/carrinho";
import { tokenDoCarrinho } from "@/server/carrinho-cookie";
import { clienteAtual } from "@/server/auth-cliente";
import { provedorDeFrete } from "@/server/frete";
import { provedorDePagamento } from "@/server/pagamentos";
import { configuracoesPublicas } from "@/server/loja-config";
import { db } from "@/lib/db";
import { CheckoutForm } from "./CheckoutForm";

export const metadata: Metadata = { title: "Finalizar compra", robots: { index: false, follow: false } };
export const dynamic = "force-dynamic";

export default async function Checkout() {
  const [cart, cliente, config] = await Promise.all([tokenDoCarrinho().then(lerCarrinho), clienteAtual(), configuracoesPublicas()]);
  if (cart.linhas.length === 0 || cart.temProblemas) redirect("/carrinho");
  const frete = provedorDeFrete(), pagamento = provedorDePagamento();
  const endereco = cliente ? await db.endereco.findFirst({ where: { usuarioId: cliente.id }, orderBy: [{ padrao: "desc" }, { id: "desc" }] }) : null;
  return (
    <CheckoutForm
      subtotalCentavos={cart.subtotalCentavos} linhas={cart.linhas.map((l) => ({ nome: l.produto.nome, quantidade: l.quantidade, subtotalCentavos: l.subtotalCentavos }))}
      freteDisponivel={!!frete && true} pagamentoDisponivel={!!pagamento} modoSimulado={pagamento?.nome === "simulado"} chavePublicaMP={process.env.NEXT_PUBLIC_MERCADO_PAGO_PUBLIC_KEY ?? null}
      whatsapp={config.whatsapp} temSobEncomenda={cart.temSobEncomenda}
      inicial={{ email: cliente?.email ?? "", nome: cliente?.nome ?? "", destinatario: endereco?.destinatario ?? "", cep: endereco?.cep ?? "", logradouro: endereco?.logradouro ?? "", numero: endereco?.numero ?? "", complemento: endereco?.complemento ?? "", bairro: endereco?.bairro ?? "", cidade: endereco?.cidade ?? "", uf: endereco?.uf ?? "" }}
    />
  );
}
