"use server";

import { revalidatePath } from "next/cache";
import { textoParaCentavos } from "@/lib/moeda";
import { type Estado } from "@/server/acao";
import { exigirPainel } from "@/server/auth";
import { salvarConfiguracoes } from "@/server/configuracoes";

export async function salvarConfig(_: Estado, fd: FormData): Promise<Estado> {
  const u = await exigirPainel({ soAdmin: true });
  const texto = (k: string) => {
    const v = String(fd.get(k) ?? "").trim();
    return v === "" ? null : v;
  };
  const apenasDigitos = (k: string) => texto(k)?.replace(/\D/g, "") ?? null;
  const gratis = texto("frete.gratisAPartirDeCentavos");
  const entrada = {
    "contato.whatsapp": apenasDigitos("contato.whatsapp"),
    "contato.email": texto("contato.email"),
    "empresa.cnpj": apenasDigitos("empresa.cnpj"),
    "empresa.endereco": texto("empresa.endereco"),
    "redes.instagram": texto("redes.instagram"),
    "redes.facebook": texto("redes.facebook"),
    "redes.tiktok": texto("redes.tiktok"),
    "redes.pinterest": texto("redes.pinterest"),
    "redes.youtube": texto("redes.youtube"),
    "frete.cepOrigem": apenasDigitos("frete.cepOrigem"),
    "frete.gratisAPartirDeCentavos": gratis === null ? null : (textoParaCentavos(gratis) ?? Number.NaN),
  };
  const r = await salvarConfiguracoes(entrada, u.id);
  if (!r.ok) return { erro: "Corrija os campos destacados.", erros: r.erros };
  revalidatePath("/", "layout");
  return { ok: "Configurações salvas." };
}
