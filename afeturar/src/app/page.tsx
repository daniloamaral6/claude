import Image from "next/image";
import Link from "next/link";
import { categorias, site } from "@/lib/site";

const secoesProdutos = [
  { id: "novidades", titulo: "Novidades" },
  { id: "mais-vendidos", titulo: "Mais vendidos" },
  { id: "favoritos-dos-clientes", titulo: "Favoritos dos clientes" },
];

function VazioProdutos() {
  return (
    <p className="rounded-[var(--radius-card)] border border-dashed border-linha px-6 py-10 text-center text-sm text-marrom-suave">
      Os produtos aparecerão aqui assim que forem cadastrados no painel.
    </p>
  );
}

export default function Home() {
  return (
    <>
      {/* Hero — espaço reservado para foto real de ambiente (a ser fornecida) */}
      <section aria-labelledby="hero-titulo" className="bg-creme-profundo">
        <div className="container-loja grid items-center gap-10 py-14 lg:grid-cols-2 lg:py-24">
          <div>
            <p className="text-xs font-medium uppercase tracking-[0.35em] text-terracota-escuro">Afeturar</p>
            <h1 id="hero-titulo" className="mt-4 text-4xl font-light leading-tight sm:text-5xl">
              {site.slogan}
            </h1>
            <p className="mt-5 max-w-md text-lg text-marrom-suave">
              Objetos para casa, presentes e peças personalizadas que transformam pequenos detalhes em algo especial.
            </p>
            <div className="mt-8 flex flex-wrap gap-3">
              <Link href="#categorias" className="btn btn-primary">Explorar produtos</Link>
              <Link href="/categorias/personalizados" className="btn btn-secondary">Peças personalizadas</Link>
            </div>
          </div>
          <div className="mx-auto w-full max-w-sm lg:max-w-md">
            <Image
              src="/brand/logo-afeturar.jpeg"
              alt="Afeturar — Dê forma ao que você sente"
              width={1254}
              height={1254}
              sizes="(min-width: 1024px) 448px, 384px"
              priority
              className="h-auto w-full rounded-full"
            />
          </div>
        </div>
      </section>

      <section id="categorias" aria-labelledby="cat-titulo" className="container-loja scroll-mt-24 pt-20">
        <h2 id="cat-titulo" className="text-2xl font-light tracking-wide sm:text-3xl">Categorias</h2>
        <ul className="mt-8 grid grid-cols-2 gap-3 sm:gap-4 md:grid-cols-4">
          {categorias.map((c) => (
            <li key={c.slug}>
              <Link
                href={`/categorias/${c.slug}`}
                className="flex aspect-[4/3] items-end rounded-[var(--radius-card)] border border-linha bg-creme-profundo p-4 text-base font-medium transition-colors hover:border-terracota hover:bg-white"
              >
                {c.nome}
              </Link>
            </li>
          ))}
        </ul>
      </section>

      {secoesProdutos.map((s) => (
        <section key={s.id} id={s.id} aria-labelledby={`${s.id}-t`} className="container-loja pt-20">
          <h2 id={`${s.id}-t`} className="text-2xl font-light tracking-wide sm:text-3xl">{s.titulo}</h2>
          <div className="mt-8"><VazioProdutos /></div>
        </section>
      ))}

      <section aria-labelledby="presentes-t" className="mt-20 bg-creme-profundo">
        <div className="container-loja grid gap-8 py-14 md:grid-cols-2">
          <div>
            <h2 id="presentes-t" className="text-2xl font-light tracking-wide sm:text-3xl">Presentes especiais</h2>
            <p className="mt-3 max-w-md text-marrom-suave">Para quem você ama e para quem merece um carinho.</p>
            <Link href="/categorias/presentes" className="btn btn-secondary mt-6">Ver presentes</Link>
          </div>
          <div>
            <h2 className="text-2xl font-light tracking-wide sm:text-3xl">Feito do seu jeito</h2>
            <p className="mt-3 max-w-md text-marrom-suave">Peças personalizadas e sob encomenda. O prazo é informado antes da compra.</p>
            <Link href="/categorias/personalizados" className="btn btn-secondary mt-6">Ver personalizados</Link>
          </div>
        </div>
      </section>

      <section aria-labelledby="insta-t" className="container-loja pt-20 text-center">
        <h2 id="insta-t" className="text-2xl font-light tracking-wide sm:text-3xl">Acompanhe no Instagram</h2>
        <p className="mt-3 text-marrom-suave">Novidades e bastidores em {site.instagramUser}.</p>
        <a href={site.instagram} target="_blank" rel="noopener noreferrer" className="btn btn-primary mt-6">
          Abrir Instagram
        </a>
      </section>

      <section aria-labelledby="news-t" className="container-loja pt-20">
        <div className="mx-auto max-w-xl rounded-[var(--radius-card)] border border-linha bg-white p-6 sm:p-8">
          <h2 id="news-t" className="text-2xl font-light tracking-wide">Receba novidades</h2>
          <form className="mt-5 space-y-4" action="#" aria-describedby="news-aviso">
            <div>
              <label htmlFor="news-email" className="mb-1 block text-sm font-medium">E-mail</label>
              <input id="news-email" name="email" type="email" required autoComplete="email" className="campo" />
            </div>
            <label className="flex items-start gap-3 text-sm">
              <input type="checkbox" name="consentimento" required className="mt-1 size-5 accent-terracota-escuro" />
              <span>Concordo em receber e-mails da Afeturar e posso cancelar quando quiser.</span>
            </label>
            <p id="news-aviso" className="text-xs text-marrom-suave">O envio será ativado na etapa de integrações.</p>
            <button type="button" disabled className="btn btn-primary">Inscrever-me</button>
          </form>
        </div>
      </section>
    </>
  );
}
