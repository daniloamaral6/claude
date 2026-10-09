import { PrototipoAviso } from "@/components/PrototipoAviso";
import { CatalogoView } from "../categorias/[slug]/CatalogoView";

export const metadata = { title: "Novidades" };

export default function Page() {
  return (<><PrototipoAviso /><CatalogoView categoriaNome="Novidades" /></>);
}
