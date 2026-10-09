import { lerConfiguracoes } from "./configuracoes";

/** Configurações exibidas na loja (rodapé, WhatsApp, avisos). Só o que foi preenchido no painel aparece. */
export async function configuracoesPublicas() {
  const c = await lerConfiguracoes();
  const s = (k: string) => (typeof c[k as keyof typeof c] === "string" && (c[k as keyof typeof c] as string).trim() ? (c[k as keyof typeof c] as string) : null);
  const gratis = c["frete.gratisAPartirDeCentavos"];
  return {
    whatsapp: s("contato.whatsapp"), email: s("contato.email"), cnpj: s("empresa.cnpj"), endereco: s("empresa.endereco"),
    redes: { instagram: s("redes.instagram"), facebook: s("redes.facebook"), tiktok: s("redes.tiktok"), pinterest: s("redes.pinterest"), youtube: s("redes.youtube") },
    freteGratisCentavos: typeof gratis === "number" ? gratis : null,
  };
}
export type ConfigPublica = Awaited<ReturnType<typeof configuracoesPublicas>>;
