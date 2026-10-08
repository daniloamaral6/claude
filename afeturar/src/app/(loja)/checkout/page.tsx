import { PrototipoAviso } from "@/components/PrototipoAviso";
import { CheckoutView } from "./CheckoutView";

export const metadata = { title: "Finalizar compra" };

export default function Page() {
  return (
    <>
      <PrototipoAviso>Fluxo ilustrativo: nenhum dado é enviado e nenhum pagamento é processado.</PrototipoAviso>
      <CheckoutView />
    </>
  );
}
