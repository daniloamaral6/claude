import { formatarBRL } from "@/lib/moeda";

export function Preco({ centavos, promocionalCentavos, aPartirDe, grande }: { centavos: number; promocionalCentavos?: number | null; aPartirDe?: boolean; grande?: boolean }) {
  const tam = grande ? "text-2xl" : "text-base";
  const prefixo = aPartirDe ? <span className="mr-1 text-xs font-normal text-marrom-suave">a partir de</span> : null;
  return promocionalCentavos ? (
    <p className={`flex flex-wrap items-baseline gap-x-2 ${tam}`}>
      {prefixo}
      <span className="sr-only">Preço promocional</span>
      <span className="font-semibold text-terracota-escuro">{formatarBRL(promocionalCentavos)}</span>
      <span className="sr-only">Preço original</span>
      <s className="text-sm text-marrom-suave">{formatarBRL(centavos)}</s>
    </p>
  ) : (
    <p className={`font-semibold ${tam}`}>{prefixo}{formatarBRL(centavos)}</p>
  );
}
