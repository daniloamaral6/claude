import type { Metadata } from "next";

export const metadata: Metadata = { title: { default: "Painel", template: "%s | Painel Afeturar" }, robots: { index: false, follow: false } };

export default function AdminRaiz({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
