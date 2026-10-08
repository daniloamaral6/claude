import { brl } from "@/lib/exemplo";

export function Preco({ preco, promocional, grande }: { preco: number; promocional?: number; grande?: boolean }) {
  const tam = grande ? "text-2xl" : "text-base";
  return promocional ? (
    <p className={`flex flex-wrap items-baseline gap-2 ${tam}`}>
      <span className="sr-only">Preço promocional</span>
      <span className="font-semibold text-terracota-escuro">{brl(promocional)}</span>
      <span className="sr-only">Preço original</span>
      <s className="text-sm text-marrom-suave">{brl(preco)}</s>
    </p>
  ) : (
    <p className={`font-semibold ${tam}`}>{brl(preco)}</p>
  );
}
