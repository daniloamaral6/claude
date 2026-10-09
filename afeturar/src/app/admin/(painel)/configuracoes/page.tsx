import { centavosParaTexto } from "@/lib/moeda";
import { exigirPainel } from "@/server/auth";
import { lerConfiguracoes } from "@/server/configuracoes";
import { FormConfig } from "./FormConfig";

export const metadata = { title: "Configurações" };
export const dynamic = "force-dynamic";

export default async function Configuracoes() {
  await exigirPainel({ soAdmin: true });
  const c = await lerConfiguracoes();
  const valores = Object.fromEntries(Object.entries(c).map(([k, v]) => [k, v == null ? "" : String(v)]));
  valores["frete.gratisAPartirDeCentavos"] = c["frete.gratisAPartirDeCentavos"] == null ? "" : centavosParaTexto(Number(c["frete.gratisAPartirDeCentavos"]));
  return (
    <div>
      <h1 className="text-2xl font-light tracking-wide sm:text-3xl">Configurações</h1>
      <p className="mb-6 mt-1 text-sm text-marrom-suave">Nada aqui é inventado: o que você não preencher simplesmente não aparece na loja.</p>
      <FormConfig valores={valores} />
    </div>
  );
}
