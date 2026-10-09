import type { Metadata } from "next";
import Link from "next/link";
import { tokenRecuperacaoValido } from "@/server/clientes";
import { FormRedefinir } from "../Formularios";

export const metadata: Metadata = { title: "Nova senha", robots: { index: false, follow: false } };
export const dynamic = "force-dynamic";

export default async function Redefinir({ searchParams }: { searchParams: Promise<{ t?: string }> }) {
  const t = (await searchParams).t ?? "";
  const valido = await tokenRecuperacaoValido(t);
  return (
    <div className="container-loja max-w-md py-10 sm:py-14">
      <h1 className="text-3xl tracking-wide">Criar nova senha</h1>
      {valido ? <div className="mt-6"><FormRedefinir token={t} /></div>
        : <p role="alert" className="mt-4 text-sm">Este link expirou ou já foi usado. <Link href="/conta/recuperar" className="underline underline-offset-4">Peça um novo</Link>.</p>}
    </div>
  );
}
