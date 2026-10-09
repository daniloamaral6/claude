"use client";

import { useRef } from "react";
import { Icone } from "./Icones";

/** Faixa horizontal com rolagem por toque e setas. Sem rotação automática (acessibilidade). */
export function Carrossel({ rotulo, children }: { rotulo: string; children: React.ReactNode }) {
  const ref = useRef<HTMLUListElement>(null);
  const rolar = (dir: 1 | -1) => {
    const el = ref.current;
    if (!el) return;
    const reduz = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    el.scrollBy({ left: dir * el.clientWidth * 0.8, behavior: reduz ? "auto" : "smooth" });
  };
  const seta = "absolute top-1/2 z-10 hidden size-11 -translate-y-1/2 items-center justify-center rounded-full border border-linha bg-white shadow hover:bg-creme-profundo md:flex";
  return (
    <div className="relative" role="region" aria-roledescription="carrossel" aria-label={rotulo}>
      <button type="button" className={`${seta} -left-5`} aria-label="Anteriores" onClick={() => rolar(-1)}><Icone nome="esquerda" /></button>
      <ul ref={ref} className="relative flex snap-x snap-mandatory gap-4 overflow-x-auto scroll-smooth pb-2 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
        {children}
      </ul>
      <button type="button" className={`${seta} -right-5`} aria-label="Próximos" onClick={() => rolar(1)}><Icone nome="direita" /></button>
    </div>
  );
}
