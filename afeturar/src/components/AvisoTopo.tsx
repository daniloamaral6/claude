import { formatarBRL } from "@/lib/moeda";
import { site } from "@/lib/site";
import { Icone } from "./Icones";

/** Faixa do topo. Só afirma frete grátis quando o valor mínimo foi configurado no painel. */
export function AvisoTopo({ freteGratisCentavos }: { freteGratisCentavos: number | null }) {
  const itens = [
    ...(freteGratisCentavos ? [{ icone: "frete", texto: `Frete grátis em compras acima de ${formatarBRL(freteGratisCentavos)}` }] : []),
    { icone: "pagamento", texto: "Pagamento por Pix e cartão" },
    { icone: "coracao", texto: site.slogan.replace(/\.$/, "") },
  ];
  return (
    <div className="bg-marrom text-creme">
      <ul className="container-loja flex min-h-10 items-center justify-center gap-x-8 py-2 text-xs sm:justify-between">
        {itens.map((a, i) => (
          <li key={a.texto} className={`items-center gap-2 ${i === 0 ? "flex" : "hidden sm:flex"}`}>
            <Icone nome={a.icone} tamanho={16} />
            {a.texto}
          </li>
        ))}
      </ul>
    </div>
  );
}
