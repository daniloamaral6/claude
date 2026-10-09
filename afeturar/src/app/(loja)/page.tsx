import Link from "next/link";
import { Carrossel } from "@/components/Carrossel";
import { FotoPlaceholder } from "@/components/FotoPlaceholder";
import { HeroSlider, type Slide } from "@/components/HeroSlider";
import { Icone } from "@/components/Icones";
import { ProdutoCardHome } from "@/components/ProdutoCardHome";
import { PrototipoAviso } from "@/components/PrototipoAviso";
import { produtosExemplo } from "@/lib/exemplo";
import { categorias, site } from "@/lib/site";

const slides: Slide[] = [
  {
    eyebrow: "Afeturar",
    titulo: site.slogan,
    texto: "Objetos para casa, presentes e peças personalizadas que transformam pequenos detalhes em algo especial.",
    cta: { href: "/loja", label: "Explorar produtos" },
    cta2: { href: "/sobre", label: "Conheça a Afeturar" },
  },
  {
    eyebrow: "Presentes e personalizados",
    titulo: "Feito do seu jeito.",
    texto: "Peças personalizadas e sob encomenda, com o prazo informado antes da compra.",
    cta: { href: "/categorias/personalizados", label: "Ver personalizados" },
  },
];

function Titulo({ eyebrow, children, id }: { eyebrow: string; children: React.ReactNode; id: string }) {
  return (
    <div>
      <p className="text-[11px] font-medium uppercase tracking-[0.25em] text-terracota-escuro">{eyebrow}</p>
      <h2 id={id} className="mt-1 text-3xl sm:text-4xl">{children}</h2>
    </div>
  );
}

export default function Home() {
  return (
    <>
      <PrototipoAviso />
      <HeroSlider slides={slides} />

      <section id="categorias" aria-labelledby="cat-t" className="container-loja scroll-mt-24 pt-14">
        <div className="flex flex-wrap items-end justify-between gap-3">
          <Titulo eyebrow="Escolha por ambiente" id="cat-t">Nossas categorias</Titulo>
          <Link href="/loja" className="inline-flex min-h-11 items-center gap-2 text-sm underline underline-offset-4 hover:text-terracota-escuro">
            Ver todas as categorias <Icone nome="seta" tamanho={16} />
          </Link>
        </div>
        <ul className="relative mt-6 flex snap-x gap-3 overflow-x-auto pb-2 [scrollbar-width:none] lg:grid lg:grid-cols-7 lg:overflow-visible [&::-webkit-scrollbar]:hidden">
          {categorias.map((c) => (
            <li key={c.slug} className="w-[40%] shrink-0 snap-start sm:w-[25%] lg:w-auto">
              <Link href={`/categorias/${c.slug}`} className="group block overflow-hidden rounded-[var(--radius-card)] border border-linha bg-white">
                <FotoPlaceholder legenda="Foto" className="aspect-[4/3] w-full transition-colors group-hover:bg-linha" />
                <span className="flex min-h-11 items-center justify-between gap-1 px-3 text-sm font-medium">
                  {c.nome} <Icone nome="direita" tamanho={14} />
                </span>
              </Link>
            </li>
          ))}
        </ul>
      </section>

      <section aria-labelledby="nov-t" className="container-loja pt-14">
        <div className="flex flex-wrap items-end justify-between gap-3">
          <Titulo eyebrow="Acabou de chegar" id="nov-t">Novidades</Titulo>
          <Link href="/lancamentos" className="btn btn-secondary">Ver novidades <Icone nome="seta" tamanho={16} /></Link>
        </div>
        <div className="mt-6">
          <Carrossel rotulo="Novidades">{produtosExemplo.map((p) => <ProdutoCardHome key={p.slug} p={p} />)}</Carrossel>
        </div>
      </section>

      <section aria-labelledby="mv-t" className="mt-14 bg-creme-profundo py-12">
        <div className="container-loja">
          <div className="flex flex-wrap items-end justify-between gap-3">
            <Titulo eyebrow="Mais amados da Afeturar" id="mv-t">Mais vendidos</Titulo>
            <Link href="/loja" className="btn btn-secondary">Ver todos os produtos <Icone nome="seta" tamanho={16} /></Link>
          </div>
          <div className="mt-6">
            <Carrossel rotulo="Mais vendidos">{[...produtosExemplo].reverse().map((p) => <ProdutoCardHome key={p.slug} p={p} />)}</Carrossel>
          </div>
        </div>
      </section>

      <section aria-labelledby="dep-t" className="container-loja pt-14">
        <div className="text-center">
          <p className="text-[11px] font-medium uppercase tracking-[0.25em] text-terracota-escuro">Histórias reais</p>
          <h2 id="dep-t" className="mt-1 text-3xl sm:text-4xl">O que nossos clientes dizem</h2>
        </div>
        <ul className="mt-8 grid gap-4 md:grid-cols-3">
          {[1, 2, 3].map((n) => (
            <li key={n} className="flex gap-4 rounded-[var(--radius-card)] border border-linha bg-white p-5">
              <div aria-hidden className="size-14 shrink-0 rounded-full bg-creme-profundo" />
              <div>
                <p className="text-sm text-marrom-suave">Espaço do depoimento. Só serão exibidas avaliações reais de clientes, com autorização.</p>
                <p className="mt-2 text-sm font-medium text-terracota-escuro">Nome do cliente</p>
              </div>
            </li>
          ))}
        </ul>
      </section>

      <section aria-labelledby="pres-t" className="container-loja mt-14">
        <h2 id="pres-t" className="sr-only">Presentes e personalizados</h2>
        <div className="grid gap-4 md:grid-cols-2">
          {[
            { t: "Presentes especiais", d: "Para quem você ama e para quem merece um carinho.", href: "/categorias/presentes", b: "Ver presentes" },
            { t: "Feito do seu jeito", d: "Peças personalizadas e sob encomenda. O prazo é informado antes da compra.", href: "/categorias/personalizados", b: "Ver personalizados" },
          ].map((c) => (
            <div key={c.t} className="rounded-[var(--radius-card)] bg-creme-profundo p-8">
              <h3 className="font-serif text-2xl">{c.t}</h3>
              <p className="mt-2 max-w-sm text-marrom-suave">{c.d}</p>
              <Link href={c.href} className="btn btn-secondary mt-5">{c.b}</Link>
            </div>
          ))}
        </div>
      </section>
    </>
  );
}
