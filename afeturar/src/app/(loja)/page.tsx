import Image from "next/image";
import Link from "next/link";
import { Carrossel } from "@/components/Carrossel";
import { HeroSlider, type Slide } from "@/components/HeroSlider";
import { Icone } from "@/components/Icones";
import { ItemCarrossel } from "@/components/ProdutoCardCarrossel";
import { site } from "@/lib/site";
import { destaques, listarCategoriasPublicas, maisVendidos, novidades, type CartaoProduto } from "@/server/catalogo";

export const dynamic = "force-dynamic";

const slides: Slide[] = [
  { eyebrow: "Afeturar", titulo: site.slogan, texto: "Objetos para casa, presentes e peças personalizadas que transformam pequenos detalhes em algo especial.", cta: { href: "/loja", label: "Explorar produtos" }, cta2: { href: "/sobre", label: "Conheça a Afeturar" } },
];

function Titulo({ eyebrow, children, id }: { eyebrow: string; children: React.ReactNode; id: string }) {
  return (
    <div>
      <p className="text-[11px] font-medium uppercase tracking-[0.25em] text-terracota-escuro">{eyebrow}</p>
      <h2 id={id} className="mt-1 text-3xl sm:text-4xl">{children}</h2>
    </div>
  );
}

function SecaoProdutos({ id, eyebrow, titulo, produtos, href, rotulo, fundo }: { id: string; eyebrow: string; titulo: string; produtos: CartaoProduto[]; href: string; rotulo: string; fundo?: boolean }) {
  if (!produtos.length) return null;
  return (
    <section aria-labelledby={id} className={fundo ? "mt-14 bg-creme-profundo py-12" : "mt-14"}>
      <div className="container-loja">
        <div className="flex flex-wrap items-end justify-between gap-3">
          <Titulo eyebrow={eyebrow} id={id}>{titulo}</Titulo>
          <Link href={href} className="btn btn-secondary">{rotulo} <Icone nome="seta" tamanho={16} /></Link>
        </div>
        <div className="mt-6"><Carrossel rotulo={titulo}>{produtos.map((p) => <ItemCarrossel key={p.id} p={p} />)}</Carrossel></div>
      </div>
    </section>
  );
}

export default async function Home() {
  const [categorias, novos, destaque, vendidos] = await Promise.all([listarCategoriasPublicas(), novidades(10), destaques(10), maisVendidos(10)]);
  const temProdutos = novos.length > 0;
  return (
    <>
      <HeroSlider slides={slides} />

      {categorias.length > 0 && (
        <section id="categorias" aria-labelledby="cat-t" className="container-loja scroll-mt-24 pt-14">
          <div className="flex flex-wrap items-end justify-between gap-3">
            <Titulo eyebrow="Escolha por ambiente" id="cat-t">Nossas categorias</Titulo>
            <Link href="/loja" className="inline-flex min-h-11 items-center gap-2 text-sm underline underline-offset-4 hover:text-terracota-escuro">Ver todos os produtos <Icone nome="seta" tamanho={16} /></Link>
          </div>
          <ul className="relative mt-6 flex snap-x gap-3 overflow-x-auto pb-2 [scrollbar-width:none] lg:grid lg:grid-cols-4 lg:overflow-visible xl:grid-cols-7 [&::-webkit-scrollbar]:hidden">
            {categorias.map((c) => (
              <li key={c.slug} className="w-[40%] shrink-0 snap-start sm:w-[25%] lg:w-auto">
                <Link href={`/categorias/${c.slug}`} className="group block overflow-hidden rounded-[var(--radius-card)] border border-linha bg-white">
                  <div className="relative aspect-[4/3] w-full bg-creme-profundo transition-colors group-hover:bg-linha">
                    {c.imagemUrl ? <Image src={c.imagemUrl} alt="" fill sizes="(min-width:1280px) 14vw, 40vw" className="object-cover" /> : <Image src="/brand/simbolo-transparente.webp" alt="" aria-hidden fill sizes="160px" className="object-contain p-[18%] opacity-25" />}
                  </div>
                  <span className="flex min-h-11 items-center justify-between gap-1 px-3 text-sm font-medium">{c.nome} <Icone nome="direita" tamanho={14} /></span>
                </Link>
              </li>
            ))}
          </ul>
        </section>
      )}

      {!temProdutos && (
        <section aria-labelledby="breve" className="container-loja pt-14 text-center">
          <h2 id="breve" className="text-3xl">Estamos preparando novidades</h2>
          <p className="mx-auto mt-3 max-w-md text-marrom-suave">Em breve você encontra aqui objetos para casa, presentes e peças personalizadas.</p>
        </section>
      )}

      <SecaoProdutos id="nov-t" eyebrow="Acabou de chegar" titulo="Novidades" produtos={novos} href="/lancamentos" rotulo="Ver novidades" />
      <SecaoProdutos id="dest-t" eyebrow="Escolhidos com carinho" titulo="Em destaque" produtos={destaque} href="/loja" rotulo="Ver todos" fundo />
      <SecaoProdutos id="mv-t" eyebrow="Mais amados da Afeturar" titulo="Mais vendidos" produtos={vendidos} href="/loja" rotulo="Ver todos os produtos" fundo={destaque.length === 0} />

      {categorias.some((c) => c.slug === "presentes" || c.slug === "personalizados") && (
        <section aria-labelledby="pres-t" className="container-loja mt-14">
          <h2 id="pres-t" className="sr-only">Presentes e personalizados</h2>
          <div className="grid gap-4 md:grid-cols-2">
            {[
              { slug: "presentes", t: "Presentes especiais", d: "Para quem você ama e para quem merece um carinho.", b: "Ver presentes" },
              { slug: "personalizados", t: "Feito do seu jeito", d: "Peças personalizadas. O prazo é informado antes da compra.", b: "Ver personalizados" },
            ].filter((c) => categorias.some((x) => x.slug === c.slug)).map((c) => (
              <div key={c.slug} className="rounded-[var(--radius-card)] bg-creme-profundo p-8">
                <h3 className="font-serif text-2xl">{c.t}</h3>
                <p className="mt-2 max-w-sm text-marrom-suave">{c.d}</p>
                <Link href={`/categorias/${c.slug}`} className="btn btn-secondary mt-5">{c.b}</Link>
              </div>
            ))}
          </div>
        </section>
      )}

      <section aria-labelledby="insta-t" className="container-loja pt-14 text-center">
        <h2 id="insta-t" className="text-2xl sm:text-3xl">Acompanhe no Instagram</h2>
        <p className="mt-3 text-marrom-suave">Novidades e bastidores em {site.instagramUser}.</p>
        <a href="https://www.instagram.com/afeturar" target="_blank" rel="noopener noreferrer" className="btn btn-primary mt-6">Abrir Instagram<span className="sr-only"> (abre em nova aba)</span></a>
      </section>
    </>
  );
}
