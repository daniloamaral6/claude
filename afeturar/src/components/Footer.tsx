import Link from "next/link";
import { categorias, site } from "@/lib/site";

const institucional = [
  { href: "/sobre", label: "Sobre a Afeturar" },
  { href: "/fale-conosco", label: "Fale conosco" },
  { href: "/perguntas-frequentes", label: "Perguntas frequentes" },
  { href: "/acompanhar-pedido", label: "Acompanhar pedido" },
];
const politicas = [
  { href: "/politica-de-privacidade", label: "Política de privacidade" },
  { href: "/termos-de-uso", label: "Termos de uso" },
  { href: "/trocas-e-devolucoes", label: "Trocas e devoluções" },
  { href: "/politica-de-entrega", label: "Política de entrega" },
];

function Coluna({ titulo, itens }: { titulo: string; itens: { href: string; label: string }[] }) {
  return (
    <div>
      <h2 className="text-sm font-semibold uppercase tracking-widest">{titulo}</h2>
      <ul className="mt-3 space-y-1 text-sm">
        {itens.map((i) => (
          <li key={i.href}>
            <Link href={i.href} className="inline-flex min-h-9 items-center underline-offset-4 hover:text-terracota-escuro hover:underline">
              {i.label}
            </Link>
          </li>
        ))}
      </ul>
    </div>
  );
}

export function Footer() {
  return (
    <footer className="mt-24 border-t border-linha bg-creme-profundo">
      <div className="container-loja grid gap-10 py-14 sm:grid-cols-2 lg:grid-cols-4">
        <div>
          <p className="text-lg font-light tracking-[0.3em]">AFETURAR</p>
          <p className="mt-2 text-sm text-marrom-suave">{site.slogan}</p>
          <p className="mt-4 text-sm">
            <a href={site.instagram} target="_blank" rel="noopener noreferrer" className="underline underline-offset-4 hover:text-terracota-escuro">
              Instagram {site.instagramUser}
            </a>
          </p>
        </div>
        <Coluna titulo="Categorias" itens={categorias.map((c) => ({ href: `/categorias/${c.slug}`, label: c.nome }))} />
        <Coluna titulo="Atendimento" itens={institucional} />
        <Coluna titulo="Políticas" itens={politicas} />
      </div>
      <div className="border-t border-linha py-5 text-center text-xs text-marrom-suave">
        © {new Date().getFullYear()} Afeturar. Todos os direitos reservados.
        {site.cnpj && <> · CNPJ {site.cnpj}</>}
      </div>
    </footer>
  );
}
