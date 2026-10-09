import type { Metadata } from "next";
import { ListaFavoritos } from "./ListaFavoritos";

export const metadata: Metadata = { title: "Favoritos", robots: { index: false, follow: false } };

export default function Favoritos() {
  return (
    <div className="container-loja py-8 sm:py-12">
      <h1 className="text-3xl tracking-wide sm:text-4xl">Favoritos</h1>
      <p className="mt-2 text-sm text-marrom-suave">Seus favoritos ficam salvos neste aparelho.</p>
      <ListaFavoritos />
    </div>
  );
}
