import type { Metadata, Viewport } from "next";
import { site } from "@/lib/site";
import "./globals.css";

const indexar = process.env.NEXT_PUBLIC_INDEXAR === "true"; // só em produção, após autorização de publicação

export const metadata: Metadata = {
  metadataBase: new URL(site.url),
  title: { default: "Afeturar — Dê forma ao que você sente", template: "%s | Afeturar" },
  description: "Objetos de decoração, organização e presentes com design, afeto e personalidade.",
  openGraph: { siteName: site.nome, locale: "pt_BR", type: "website" },
  robots: indexar ? undefined : { index: false, follow: false },
};

export const viewport: Viewport = { themeColor: "#fdf6ee", width: "device-width", initialScale: 1 };

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="pt-BR">
      <body className="flex min-h-screen flex-col">
        {children}
      </body>
    </html>
  );
}
