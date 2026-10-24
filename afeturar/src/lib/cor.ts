const SEM_COR = "linear-gradient(135deg,#f4f1ee,#b9b2ab)";

/** Fundo da bolinha de cor. Aceita "#RRGGBB" ou duas cores "#RRGGBB/#RRGGBB" (bolinha dividida na diagonal). */
export function fundoCor(hex: string | null | undefined): string {
  if (!hex) return SEM_COR;
  const [a, b] = hex.split("/");
  return b ? `linear-gradient(135deg,${a} 50%,${b} 50%)` : a;
}
