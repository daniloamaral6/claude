/**
 * Dados institucionais EDITÁVEIS. No MVP virão do banco (painel admin).
 * Nada aqui é inventado: o que não foi fornecido fica nulo.
 */
export const site = {
  nome: "Afeturar",
  slogan: "Dê forma ao que você sente.",
  instagram: "https://www.instagram.com/afeturar",
  instagramUser: "@afeturar",
  whatsapp: null as string | null, // número a ser fornecido (somente dígitos com DDI, ex.: 55...)
  cnpj: null as string | null,
  endereco: null as string | null,
  email: null as string | null,
};

/** Categorias iniciais (editáveis no admin no MVP). */
export const categorias = [
  { slug: "casa-decoracao", nome: "Casa & Decoração" },
  { slug: "organizacao", nome: "Organização" },
  { slug: "beleza-acessorios", nome: "Beleza & Acessórios" },
  { slug: "pet", nome: "Pet" },
  { slug: "fe", nome: "Fé" },
  { slug: "presentes", nome: "Presentes" },
  { slug: "personalizados", nome: "Personalizados" },
] as const;

/**
 * Faixa de avisos do topo (editável no painel). Textos provisórios e neutros:
 * só passam a afirmar valores/condições quando você os definir (ex.: mínimo de frete grátis).
 */
export const avisosTopo = [
  { icone: "frete", texto: "Frete grátis por valor mínimo (a configurar)" },
  { icone: "pagamento", texto: "Pagamento por Pix e cartão" },
  { icone: "coracao", texto: "Dê forma ao que você sente" },
] as const;

export const navPrincipal = [
  { href: "/", label: "Início" },
  { href: "/loja", label: "Loja" },
  { href: "#categorias", label: "Categorias", submenu: true },
  { href: "/lancamentos", label: "Novidades" },
  { href: "/sobre", label: "Sobre" },
  { href: "/fale-conosco", label: "Contato" },
] as const;
