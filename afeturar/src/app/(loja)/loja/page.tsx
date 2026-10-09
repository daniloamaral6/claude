import { PrototipoAviso } from "@/components/PrototipoAviso";
import { CatalogoView } from "../categorias/[slug]/CatalogoView";

export const metadata = { title: "Loja" };

export default function Page() {
  return (<><PrototipoAviso /><CatalogoView categoriaNome="Loja" /></>);
}
