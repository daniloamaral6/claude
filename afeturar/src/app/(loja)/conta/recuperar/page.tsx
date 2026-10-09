import type { Metadata } from "next";
import { FormRecuperar } from "../Formularios";

export const metadata: Metadata = { title: "Recuperar senha", robots: { index: false, follow: false } };

export default function Recuperar() {
  return (
    <div className="container-loja max-w-md py-10 sm:py-14">
      <h1 className="text-3xl tracking-wide">Recuperar senha</h1>
      <p className="mb-6 mt-2 text-sm text-marrom-suave">Informe o e-mail da sua conta e enviaremos um link para criar uma nova senha.</p>
      <FormRecuperar />
    </div>
  );
}
