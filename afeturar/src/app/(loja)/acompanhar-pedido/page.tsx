import type { Metadata } from "next";
import { FormAcompanhar } from "../conta/Formularios";

export const metadata: Metadata = { title: "Acompanhar pedido", alternates: { canonical: "/acompanhar-pedido" } };

export default function Acompanhar() {
  return (
    <div className="container-loja max-w-md py-10 sm:py-14">
      <h1 className="text-3xl tracking-wide">Acompanhar pedido</h1>
      <p className="mb-6 mt-2 text-sm text-marrom-suave">Digite o número do pedido e o e-mail usado na compra. Você também recebeu um link por e-mail.</p>
      <FormAcompanhar />
    </div>
  );
}
