"use client";

import Image from "next/image";
import Link from "next/link";
import { useEffect, useId, useState } from "react";
import { categorias, site } from "@/lib/site";

const iconProps = {
  width: 22,
  height: 22,
  viewBox: "0 0 24 24",
  fill: "none",
  stroke: "currentColor",
  strokeWidth: 1.6,
  strokeLinecap: "round" as const,
  strokeLinejoin: "round" as const,
  "aria-hidden": true,
};

const IconBtn = "inline-flex size-11 items-center justify-center rounded-full text-marrom hover:bg-creme-profundo";

export function Header() {
  const [menuAberto, setMenuAberto] = useState(false);
  const [buscaAberta, setBuscaAberta] = useState(false);
  const menuId = useId();

  useEffect(() => {
    if (!menuAberto) return;
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && setMenuAberto(false);
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [menuAberto]);

  return (
    <header className="sticky top-0 z-40 border-b border-linha bg-creme/95 backdrop-blur">
      <a
        href="#conteudo"
        className="sr-only focus:not-sr-only focus:absolute focus:left-4 focus:top-2 focus:z-50 focus:rounded focus:bg-marrom focus:px-3 focus:py-2 focus:text-creme"
      >
        Ir para o conteúdo
      </a>
      <div className="container-loja flex h-20 items-center gap-2">
        <button
          type="button"
          className={`${IconBtn} lg:hidden`}
          aria-expanded={menuAberto}
          aria-controls={menuId}
          aria-label={menuAberto ? "Fechar menu" : "Abrir menu"}
          onClick={() => setMenuAberto((v) => !v)}
        >
          <svg {...iconProps}>
            {menuAberto ? <path d="M6 6l12 12M18 6L6 18" /> : <path d="M4 7h16M4 12h16M4 17h16" />}
          </svg>
        </button>

        <Link href="/" aria-label="Afeturar — início" className="shrink-0">
          <Image
            src="/brand/logo-afeturar.jpeg"
            alt="Afeturar — Dê forma ao que você sente"
            width={64}
            height={64}
            priority
            className="size-14 rounded-full sm:size-16"
          />
        </Link>

        <nav aria-label="Principal" className="mx-6 hidden flex-1 lg:block">
          <ul className="flex flex-wrap items-center gap-x-5 gap-y-1 text-sm">
            {categorias.map((c) => (
              <li key={c.slug}>
                <Link href={`/categorias/${c.slug}`} className="inline-flex min-h-11 items-center hover:text-terracota-escuro hover:underline underline-offset-4">
                  {c.nome}
                </Link>
              </li>
            ))}
          </ul>
        </nav>

        <div className="ml-auto flex items-center">
          <button
            type="button"
            className={IconBtn}
            aria-label="Buscar produtos"
            aria-expanded={buscaAberta}
            onClick={() => setBuscaAberta((v) => !v)}
          >
            <svg {...iconProps}><circle cx="11" cy="11" r="6.5" /><path d="M16 16l4 4" /></svg>
          </button>
          <Link href="/conta" className={IconBtn} aria-label="Minha conta">
            <svg {...iconProps}><circle cx="12" cy="8" r="3.5" /><path d="M5 20c1-4 4-5.5 7-5.5s6 1.5 7 5.5" /></svg>
          </Link>
          <Link href="/favoritos" className={IconBtn} aria-label="Favoritos">
            <svg {...iconProps}><path d="M12 20s-7-4.4-7-10a4 4 0 0 1 7-2.6A4 4 0 0 1 19 10c0 5.6-7 10-7 10z" /></svg>
          </Link>
          <Link href="/carrinho" className={IconBtn} aria-label="Carrinho">
            <svg {...iconProps}><path d="M5 8h14l-1.2 11H6.2L5 8z" /><path d="M9 8V7a3 3 0 0 1 6 0v1" /></svg>
          </Link>
        </div>
      </div>

      {buscaAberta && (
        <div className="border-t border-linha bg-creme">
          <form role="search" action="/busca" className="container-loja flex gap-2 py-3">
            <label htmlFor="busca" className="sr-only">Buscar produtos</label>
            <input id="busca" name="q" type="search" placeholder="O que você procura?" className="campo" autoFocus />
            <button type="submit" className="btn btn-primary">Buscar</button>
          </form>
        </div>
      )}

      {menuAberto && (
        <nav id={menuId} aria-label="Menu móvel" className="border-t border-linha bg-creme lg:hidden">
          <ul className="container-loja py-2">
            {categorias.map((c) => (
              <li key={c.slug} className="border-b border-linha last:border-0">
                <Link
                  href={`/categorias/${c.slug}`}
                  className="flex min-h-12 items-center"
                  onClick={() => setMenuAberto(false)}
                >
                  {c.nome}
                </Link>
              </li>
            ))}
          </ul>
        </nav>
      )}
      <span className="sr-only">{site.nome}</span>
    </header>
  );
}
