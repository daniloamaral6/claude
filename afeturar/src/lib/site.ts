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
