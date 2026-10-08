export function PrototipoAviso({ children }: { children?: React.ReactNode }) {
  return (
    <div role="note" className="border-b border-linha bg-cobre/20 px-4 py-2 text-center text-xs text-marrom">
      <strong>Protótipo de design.</strong>{" "}
      {children ?? "Nomes, preços, prazos e pedidos são ilustrativos e não representam o catálogo real da Afeturar."}
    </div>
  );
}
