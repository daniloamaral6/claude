import Image from "next/image";
import Link from "next/link";
import { site } from "@/lib/site";
import { Icone } from "./Icones";

const institucional = [
  { href: "/sobre", label: "Sobre a Afeturar" },
  { href: "/fale-conosco", label: "Fale conosco" },
  { href: "/perguntas-frequentes", label: "Perguntas frequentes" },
  { href: "/politica-de-privacidade", label: "Política de privacidade" },
  { href: "/termos-de-uso", label: "Termos de uso" },
];
const conta = [
  { href: "/conta", label: "Minha conta" },
  { href: "/acompanhar-pedido", label: "Meus pedidos" },
  { href: "/trocas-e-devolucoes", label: "Trocas e devoluções" },
  { href: "/politica-de-entrega", label: "Política de entrega" },
];

function Coluna({ titulo, itens }: { titulo: string; itens: { href: string; label: string }[] }) {
  return (
    <div>
      <h2 className="text-sm font-semibold">{titulo}</h2>
      <ul className="mt-3 space-y-1 text-sm">
        {itens.map((i) => (
          <li key={i.href}><Link href={i.href} className="inline-flex min-h-9 items-center underline-offset-4 hover:text-terracota-escuro hover:underline">{i.label}</Link></li>
        ))}
      </ul>
    </div>
  );
}

export function Footer() {
  return (
    <footer className="mt-20 border-t border-linha bg-creme-profundo">
      <div className="container-loja grid gap-10 py-12 sm:grid-cols-2 lg:grid-cols-[1.1fr_1fr_1fr_1.6fr_1fr]">
        <div>
          <Image src="/brand/logo-afeturar.jpeg" alt="Afeturar — Dê forma ao que você sente" width={120} height={120} className="size-28 rounded-full" />
        </div>
        <Coluna titulo="Institucional" itens={institucional} />
        <Coluna titulo="Minha conta" itens={conta} />
        <div>
          <h2 className="text-sm font-semibold">Receba nossas novidades</h2>
          <p className="mt-2 text-sm text-marrom-suave">Cadastre seu e-mail e fique por dentro de lançamentos e ofertas especiais.</p>
          <form className="mt-3 space-y-3" action="#">
            <div className="flex gap-2">
              <label htmlFor="news-email" className="sr-only">Seu e-mail</label>
              <input id="news-email" name="email" type="email" required autoComplete="email" placeholder="Seu e-mail" className="campo" />
              <button type="button" disabled className="btn btn-primary" title="O envio será ativado na etapa de integrações">Cadastrar</button>
            </div>
            <label className="flex items-start gap-2 text-xs text-marrom-suave">
              <input type="checkbox" name="consentimento" required className="mt-0.5 size-5 shrink-0 accent-terracota-escuro" />
              <span>Concordo em receber e-mails da Afeturar e posso cancelar quando quiser.</span>
            </label>
          </form>
        </div>
        <div>
          <h2 className="text-sm font-semibold">Acompanhe a Afeturar</h2>
          <ul className="mt-3 flex gap-2">
            <li>
              <a href={site.instagram} target="_blank" rel="noopener noreferrer" aria-label={`Instagram ${site.instagramUser}`} className="inline-flex size-11 items-center justify-center rounded-full border border-marrom hover:bg-creme">
                <Icone nome="instagram" />
              </a>
            </li>
          </ul>
          <p className="mt-3 text-sm text-marrom-suave">{site.instagramUser}</p>
        </div>
      </div>
      <div className="border-t border-linha py-4 text-center text-xs text-marrom-suave">
        <div className="container-loja flex flex-wrap items-center justify-between gap-2">
          <p>© {new Date().getFullYear()} Afeturar. Todos os direitos reservados.{site.cnpj && <> · CNPJ {site.cnpj}</>}</p>
          <p>{site.slogan}</p>
        </div>
      </div>
    </footer>
  );
}
