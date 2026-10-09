import Image from "next/image";
import Link from "next/link";
import { site, type CategoriaMenu } from "@/lib/site";
import type { ConfigPublica } from "@/server/loja-config";
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
  { href: "/acompanhar-pedido", label: "Acompanhar pedido" },
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

const nomesRedes: Record<string, string> = { instagram: "Instagram", facebook: "Facebook", tiktok: "TikTok", pinterest: "Pinterest", youtube: "YouTube" };

export function Footer({ categorias, config }: { categorias: CategoriaMenu[]; config: ConfigPublica }) {
  const redes = Object.entries(config.redes).filter(([, url]) => url) as [string, string][];
  return (
    <footer className="mt-20 border-t border-linha bg-creme-profundo">
      <div className="container-loja grid gap-10 py-12 sm:grid-cols-2 lg:grid-cols-[1.1fr_1fr_1fr_1fr_1.4fr]">
        <div>
          <Image src="/brand/logo-circular.webp" alt="Afeturar — Dê forma ao que você sente" width={120} height={120} className="size-28 rounded-full" />
        </div>
        {categorias.length > 0 && <Coluna titulo="Categorias" itens={categorias.map((c) => ({ href: `/categorias/${c.slug}`, label: c.nome }))} />}
        <Coluna titulo="Institucional" itens={institucional} />
        <Coluna titulo="Atendimento" itens={conta} />
        <div>
          <h2 className="text-sm font-semibold">Siga a Afeturar</h2>
          {redes.length > 0 ? (
            <ul className="mt-3 flex flex-wrap gap-2">
              {redes.map(([nome, url]) => (
                <li key={nome}>
                  <a href={url} target="_blank" rel="noopener noreferrer" aria-label={`${nomesRedes[nome]} (abre em nova aba)`} className="inline-flex min-h-11 items-center justify-center gap-2 rounded-full border border-marrom px-4 text-sm hover:bg-creme">
                    {nome === "instagram" && <Icone nome="instagram" tamanho={18} />}{nomesRedes[nome]}
                  </a>
                </li>
              ))}
            </ul>
          ) : <p className="mt-3 text-sm text-marrom-suave">{site.instagramUser}</p>}
          {(config.email || config.whatsapp) && (
            <ul className="mt-4 space-y-1 text-sm">
              {config.email && <li><a href={`mailto:${config.email}`} className="underline underline-offset-4">{config.email}</a></li>}
              {config.whatsapp && <li><a href={`https://wa.me/${config.whatsapp}`} target="_blank" rel="noopener noreferrer" className="underline underline-offset-4">WhatsApp</a></li>}
            </ul>
          )}
        </div>
      </div>
      <div className="border-t border-linha py-4 text-center text-xs text-marrom-suave">
        <div className="container-loja flex flex-wrap items-center justify-between gap-2">
          <p>© {new Date().getFullYear()} Afeturar. Todos os direitos reservados.{config.cnpj && <> · CNPJ {config.cnpj.replace(/^(\d{2})(\d{3})(\d{3})(\d{4})(\d{2})$/, "$1.$2.$3/$4-$5")}</>}{config.endereco && <> · {config.endereco}</>}</p>
          <p>{site.slogan}</p>
        </div>
      </div>
    </footer>
  );
}
