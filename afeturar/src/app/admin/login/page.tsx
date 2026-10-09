import Image from "next/image";
import { redirect } from "next/navigation";
import { usuarioDoPainel } from "@/server/auth";
import { FormLogin } from "./FormLogin";

export const metadata = { title: "Entrar" };

export default async function Login() {
  if (await usuarioDoPainel()) redirect("/admin");
  return (
    <main id="conteudo" className="mx-auto flex min-h-screen w-full max-w-sm flex-col justify-center px-4 py-12">
      <Image src="/brand/logo-afeturar.jpeg" alt="Afeturar" width={112} height={112} priority className="mx-auto size-28 rounded-full" />
      <h1 className="mt-6 text-center text-2xl font-light tracking-wide">Painel da loja</h1>
      <FormLogin />
    </main>
  );
}
