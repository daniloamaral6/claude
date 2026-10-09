"use client";

import Link from "next/link";
import { useState } from "react";
import Image from "next/image";
import { Icone } from "./Icones";

export interface Slide {
  eyebrow: string;
  titulo: string;
  texto: string;
  cta: { href: string; label: string };
  cta2?: { href: string; label: string };
}

const valores = [
  { icone: "casa", texto: "Para a sua casa" },
  { icone: "presente", texto: "Para presentear" },
  { icone: "caneta", texto: "Feito do seu jeito" },
];

/** Banner principal: foto de ambiente (a fornecer) com texto à esquerda. Troca manual, sem rotação automática. */
export function HeroSlider({ slides }: { slides: Slide[] }) {
  const [i, setI] = useState(0);
  const s = slides[i];
  const multi = slides.length > 1;
  const ir = (n: number) => setI((n + slides.length) % slides.length);
  const seta = "absolute top-1/2 z-10 hidden size-11 -translate-y-1/2 items-center justify-center rounded-full border border-linha bg-white/90 hover:bg-white sm:inline-flex";

  return (
    <section aria-roledescription="carrossel" aria-label="Destaques" className="relative isolate overflow-hidden bg-creme-profundo">
      {/* Enquanto não há foto de ambiente, o símbolo da marca ocupa o fundo (troque por foto real via banner). */}
      <Image src="/brand/simbolo-transparente.webp" alt="" aria-hidden width={760} height={507} priority className="absolute -right-10 top-1/2 -z-20 hidden w-[52%] max-w-3xl -translate-y-1/2 opacity-[0.14] lg:block" />
      <div className="absolute inset-0 -z-10 bg-gradient-to-r from-creme-profundo via-creme-profundo/90 to-creme-profundo/40" aria-hidden />

      <div className="container-loja flex min-h-[26rem] flex-col justify-center gap-8 py-12 lg:min-h-[30rem]">
        <div role="group" aria-roledescription="slide" aria-label={`${i + 1} de ${slides.length}`} aria-live="polite" className="max-w-xl">
          <p className="text-xs font-medium uppercase tracking-[0.3em] text-terracota-escuro">{s.eyebrow}</p>
          <h1 className="mt-3 text-4xl leading-tight sm:text-5xl">{s.titulo}</h1>
          <p className="mt-4 max-w-md text-lg text-marrom-suave">{s.texto}</p>
          <div className="mt-6 flex flex-wrap gap-3">
            <Link href={s.cta.href} className="btn btn-primary">{s.cta.label} <Icone nome="seta" tamanho={18} /></Link>
            {s.cta2 && <Link href={s.cta2.href} className="btn btn-secondary">{s.cta2.label}</Link>}
          </div>
        </div>

        <ul className="hidden max-w-xl grid-cols-3 gap-4 text-center text-sm sm:grid">
          {valores.map((v) => (
            <li key={v.texto} className="flex flex-col items-center gap-2"><Icone nome={v.icone} tamanho={26} className="text-terracota-escuro" />{v.texto}</li>
          ))}
        </ul>
      </div>

      {multi && (
        <>
          <button type="button" className={`${seta} left-3`} aria-label="Slide anterior" onClick={() => ir(i - 1)}><Icone nome="esquerda" /></button>
          <button type="button" className={`${seta} right-3`} aria-label="Próximo slide" onClick={() => ir(i + 1)}><Icone nome="direita" /></button>
          <div className="absolute bottom-3 left-1/2 flex -translate-x-1/2 gap-1" role="group" aria-label="Escolher slide">
            {slides.map((_, n) => (
              <button key={n} type="button" aria-label={`Slide ${n + 1}`} aria-current={n === i} onClick={() => setI(n)} className="inline-flex size-6 items-center justify-center">
                <span className={`size-2.5 rounded-full ${n === i ? "bg-terracota-escuro" : "bg-terracota/50"}`} />
              </button>
            ))}
          </div>
        </>
      )}
    </section>
  );
}
