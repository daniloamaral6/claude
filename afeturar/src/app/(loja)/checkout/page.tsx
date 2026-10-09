import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { PrototipoAviso } from "@/components/PrototipoAviso";
import { lerCarrinho } from "@/server/carrinho";
import { tokenDoCarrinho } from "@/server/carrinho-cookie";
import { CheckoutView } from "./CheckoutView";

export const metadata: Metadata = { title: "Finalizar compra", robots: { index: false, follow: false } };
export const dynamic = "force-dynamic";

export default async function Checkout() {
  const c = await lerCarrinho(await tokenDoCarrinho());
  if (c.linhas.length === 0 || c.temProblemas) redirect("/carrinho");
  return (
    <>
      <PrototipoAviso>Etapa em construção: o fluxo abaixo é ilustrativo. Nenhum dado é enviado e nenhum pagamento é processado.</PrototipoAviso>
      <CheckoutView subtotalCentavos={c.subtotalCentavos} />
    </>
  );
}
