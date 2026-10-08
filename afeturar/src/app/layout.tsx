import type { Metadata, Viewport } from "next";
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
        {children}
      </body>
    </html>
  );
}
