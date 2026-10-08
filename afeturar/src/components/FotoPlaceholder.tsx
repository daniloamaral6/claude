/** Espaço reservado para fotografia real do produto. Nunca usar imagens geradas ou das capturas do kit. */
export function FotoPlaceholder({ legenda = "Foto do produto", className = "" }: { legenda?: string; className?: string }) {
  return (
    <div
      role="img"
      aria-label={`${legenda} (espaço reservado)`}
      className={`flex items-center justify-center bg-creme-profundo text-xs text-marrom-suave ${className}`}
    >
      {legenda}
    </div>
  );
}
