/** Identidade fixa da marca. Dados editáveis (contato, redes, frete) vêm do painel: ver server/loja-config.ts. */
export const site = {
  nome: "Afeturar",
  slogan: "Dê forma ao que você sente.",
  /** Endereço público da loja (SEO, compartilhamento). Defina NEXT_PUBLIC_SITE_URL em produção. */
  url: (process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000").replace(/\/$/, ""),
  instagramUser: "@afeturar",
};

export const navPrincipal = [
  { href: "/", label: "Início" },
  { href: "/loja", label: "Loja" },
  { href: "#categorias", label: "Categorias", submenu: true },
  { href: "/lancamentos", label: "Novidades" },
  { href: "/sobre", label: "Sobre" },
  { href: "/fale-conosco", label: "Contato" },
] as const;

export interface CategoriaMenu { slug: string; nome: string; filhas: { slug: string; nome: string }[] }
