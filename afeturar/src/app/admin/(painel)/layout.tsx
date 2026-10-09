import Image from "next/image";
import { exigirPainel, sairDoPainel } from "@/server/auth";
import { AdminNav } from "./AdminNav";

export default async function PainelLayout({ children }: { children: React.ReactNode }) {
  const usuario = await exigirPainel();

  async function sair() {
    "use server";
    await sairDoPainel();
    const { redirect } = await import("next/navigation");
    redirect("/admin/login");
  }

  return (
    <div className="flex min-h-screen flex-col lg:flex-row">
      <aside className="border-b border-linha bg-creme-profundo lg:w-60 lg:shrink-0 lg:border-b-0 lg:border-r">
        <div className="flex items-center gap-3 p-4">
          <Image src="/brand/logo-afeturar.jpeg" alt="Afeturar" width={48} height={48} className="size-12 rounded-full" />
          <span className="text-sm font-semibold tracking-widest">PAINEL</span>
        </div>
        <AdminNav ehAdmin={usuario.papel === "ADMIN"} />
        <div className="hidden border-t border-linha p-4 text-xs lg:block">
          <p className="truncate" title={usuario.email}>{usuario.nome ?? usuario.email}</p>
          <p className="text-marrom-suave">{usuario.papel === "ADMIN" ? "Administrador" : "Equipe"}</p>
          <form action={sair} className="mt-2"><button type="submit" className="min-h-9 underline underline-offset-4 hover:text-terracota-escuro">Sair</button></form>
        </div>
      </aside>
      <main id="conteudo" className="min-w-0 flex-1 p-4 sm:p-8">{children}</main>
    </div>
  );
}
