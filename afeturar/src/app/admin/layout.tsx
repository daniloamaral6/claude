import type { Metadata } from "next";
import Image from "next/image";
import { AdminNav } from "./AdminNav";
import { PrototipoAviso } from "@/components/PrototipoAviso";

export const metadata: Metadata = { title: { default: "Painel", template: "%s | Painel Afeturar" }, robots: { index: false, follow: false } };

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  return (
    <>
      <PrototipoAviso>Painel ilustrativo, sem login e sem dados reais. No MVP terá autenticação segura, perfis de acesso e registro de ações.</PrototipoAviso>
      <div className="flex flex-1 flex-col lg:flex-row">
        <aside className="border-b border-linha bg-creme-profundo lg:w-60 lg:shrink-0 lg:border-b-0 lg:border-r">
          <div className="flex items-center gap-3 p-4">
            <Image src="/brand/logo-afeturar.jpeg" alt="Afeturar" width={48} height={48} className="size-12 rounded-full" />
            <span className="text-sm font-semibold tracking-widest">PAINEL</span>
          </div>
          <AdminNav />
        </aside>
        <main id="conteudo" className="min-w-0 flex-1 p-4 sm:p-8">{children}</main>
      </div>
    </>
  );
}
