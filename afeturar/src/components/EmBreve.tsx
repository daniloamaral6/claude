import Link from "next/link";

export function EmBreve({ titulo, texto }: { titulo: string; texto?: string }) {
  return (
    <section className="container-loja py-24 text-center">
      <h1 className="text-3xl font-light tracking-wide">{titulo}</h1>
      <p className="mx-auto mt-4 max-w-md text-marrom-suave">
        {texto ?? "Esta página será construída nas próximas etapas do projeto."}
      </p>
      <Link href="/" className="btn btn-secondary mt-8">Voltar ao início</Link>
    </section>
  );
}
