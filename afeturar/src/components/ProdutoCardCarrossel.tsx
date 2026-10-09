import type { CartaoProduto } from "@/server/catalogo";
import { ProdutoCard } from "./ProdutoCard";

/** Item do carrossel da home (largura fixa responsiva). */
export function ItemCarrossel({ p }: { p: CartaoProduto }) {
  return <li className="w-[62%] shrink-0 snap-start sm:w-[34%] md:w-[24%] lg:w-[19%]"><ProdutoCard p={p} /></li>;
}
