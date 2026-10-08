import { PrototipoAviso } from "@/components/PrototipoAviso";
import { CarrinhoView } from "./CarrinhoView";

export const metadata = { title: "Carrinho" };

export default function Page() {
  return (
    <>
      <PrototipoAviso />
      <CarrinhoView />
    </>
  );
}
