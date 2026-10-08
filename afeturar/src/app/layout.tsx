import type { Metadata, Viewport } from "next";
import { Footer } from "@/components/Footer";
import { Header } from "@/components/Header";
import { WhatsAppButton } from "@/components/WhatsAppButton";
import "./globals.css";

export const metadata: Metadata = {
  title: { default: "Afeturar — Dê forma ao que você sente", template: "%s | Afeturar" },
  description: "Objetos de decoração, organização e presentes com design, afeto e personalidade.",
  robots: { index: false, follow: false }, // desenvolvimento: não indexar até a publicação autorizada
};

export const viewport: Viewport = { themeColor: "#fdf6ee", width: "device-width", initialScale: 1 };

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="pt-BR">
      <body className="flex min-h-screen flex-col">
        <Header />
        <main id="conteudo" className="flex-1">{children}</main>
        <Footer />
        <WhatsAppButton />
      </body>
    </html>
  );
}
