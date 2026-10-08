"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const itens = [
  { href: "/admin", label: "Dashboard" },
  { href: "/admin/produtos", label: "Produtos" },
  { href: "/admin/pedidos", label: "Pedidos" },
];
const emBreve = ["Clientes", "Cupons e promoções", "Banners", "Categorias", "Frete", "Pagamentos", "Páginas", "Relatórios", "Configurações"];

export function AdminNav() {
  const path = usePathname();
  return (
    <nav aria-label="Painel" className="px-2 pb-4">
      <ul className="flex gap-1 overflow-x-auto lg:flex-col lg:overflow-visible">
        {itens.map((i) => {
          const ativo = i.href === "/admin" ? path === "/admin" : path.startsWith(i.href);
          return (
            <li key={i.href}>
              <Link href={i.href} aria-current={ativo ? "page" : undefined} className={`flex min-h-11 items-center whitespace-nowrap rounded-lg px-3 text-sm ${ativo ? "bg-terracota-escuro text-creme" : "hover:bg-linha"}`}>
                {i.label}
              </Link>
            </li>
          );
        })}
        {emBreve.map((l) => (
          <li key={l} className="hidden lg:block">
            <span className="flex min-h-9 items-center gap-2 whitespace-nowrap px-3 text-sm text-marrom-suave" aria-disabled="true">{l} <span className="text-[10px] uppercase tracking-wider">em breve</span></span>
          </li>
        ))}
      </ul>
    </nav>
  );
}
