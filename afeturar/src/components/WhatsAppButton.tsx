import { site } from "@/lib/site";

/** Só aparece quando o número for configurado (nunca inventamos contato). */
export function WhatsAppButton() {
  if (!site.whatsapp) return null;
  return (
    <a
      href={`https://wa.me/${site.whatsapp}`}
      target="_blank"
      rel="noopener noreferrer"
      aria-label="Falar pelo WhatsApp"
      className="fixed bottom-4 right-4 z-40 inline-flex min-h-12 items-center rounded-full bg-terracota-escuro px-5 text-sm font-medium text-creme shadow-lg hover:bg-acao-hover"
    >
      WhatsApp
    </a>
  );
}
