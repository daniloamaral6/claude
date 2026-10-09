/** Só aparece quando o número foi configurado no painel (nunca inventamos contato). */
export function WhatsAppButton({ numero }: { numero: string | null }) {
  if (!numero) return null;
  return (
    <a
      href={`https://wa.me/${numero}`} target="_blank" rel="noopener noreferrer" aria-label="Falar pelo WhatsApp (abre em nova aba)"
      className="fixed bottom-4 right-4 z-40 inline-flex min-h-12 items-center rounded-full bg-terracota-escuro px-5 text-sm font-medium text-creme shadow-lg hover:bg-acao-hover"
    >
      WhatsApp
    </a>
  );
}
