"use client";

import Image from "next/image";
import Link from "next/link";
import { useEffect, useId, useRef, useState } from "react";
import { categorias, navPrincipal } from "@/lib/site";
import { Icone } from "./Icones";

const IconBtn = "relative inline-flex size-11 items-center justify-center rounded-full text-marrom hover:bg-creme-profundo";
const NavLink = "inline-flex min-h-11 items-center px-1 text-sm underline-offset-8 hover:text-terracota-escuro hover:underline";

export function Header({ carrinhoQtd = 0 }: { carrinhoQtd?: number }) {
  const [menuAberto, setMenuAberto] = useState(false);
  const [catAberto, setCatAberto] = useState(false);
  const [buscaAberta, setBuscaAberta] = useState(false);
  const menuId = useId();
  const catId = useId();
  const catRef = useRef<HTMLLIElement>(null);

  useEffect(() => {
    if (!menuAberto && !catAberto) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") { setMenuAberto(false); setCatAberto(false); }
    };
    const onClick = (e: MouseEvent) => {
      if (catRef.current && !catRef.current.contains(e.target as Node)) setCatAberto(false);
    };
    window.addEventListener("keydown", onKey);
    window.addEventListener("click", onClick);
    return () => { window.removeEventListener("keydown", onKey); window.removeEventListener("click", onClick); };
  }, [menuAberto, catAberto]);

  return (
    <header className="sticky top-0 z-40 border-b border-linha bg-creme/95 backdrop-blur">
      <a href="#conteudo" className="sr-only focus:not-sr-only focus:absolute focus:left-4 focus:top-2 focus:z-50 focus:rounded focus:bg-marrom focus:px-3 focus:py-2 focus:text-creme">
        Ir para o conteúdo
      </a>
      <div className="container-loja flex h-20 items-center gap-2">
        <button type="button" className={`${IconBtn} lg:hidden`} aria-expanded={menuAberto} aria-controls={menuId} aria-label={menuAberto ? "Fechar menu" : "Abrir menu"} onClick={() => setMenuAberto((v) => !v)}>
          <Icone nome={menuAberto ? "fechar" : "menu"} />
        </button>

        <Link href="/" aria-label="Afeturar — início" className="shrink-0">
          <Image src="/brand/logo-circular.webp" alt="Afeturar — Dê forma ao que você sente" width={72} height={72} priority className="size-14 rounded-full sm:size-[68px]" />
        </Link>

        <nav aria-label="Principal" className="hidden flex-1 justify-center lg:flex">
          <ul className="flex items-center gap-8">
            {navPrincipal.map((n) =>
              "submenu" in n ? (
                <li key={n.label} ref={catRef} className="relative">
                  <button type="button" className={`${NavLink} gap-1`} aria-expanded={catAberto} aria-controls={catId} onClick={() => setCatAberto((v) => !v)}>
                    {n.label} <Icone nome="baixo" tamanho={14} />
                  </button>
                  {catAberto && (
                    <ul id={catId} className="absolute left-1/2 top-full z-50 mt-2 w-64 -translate-x-1/2 rounded-[var(--radius-card)] border border-linha bg-white p-2 shadow-lg">
                      {categorias.map((c) => (
                        <li key={c.slug}>
                          <Link href={`/categorias/${c.slug}`} className="flex min-h-11 items-center rounded-lg px-3 text-sm hover:bg-creme-profundo" onClick={() => setCatAberto(false)}>{c.nome}</Link>
                        </li>
                      ))}
                    </ul>
                  )}
                </li>
              ) : (
                <li key={n.label}><Link href={n.href} className={NavLink}>{n.label}</Link></li>
              ),
            )}
          </ul>
        </nav>

        <div className="ml-auto flex items-center">
          <button type="button" className={IconBtn} aria-label="Buscar produtos" aria-expanded={buscaAberta} onClick={() => setBuscaAberta((v) => !v)}><Icone nome="busca" /></button>
          <Link href="/conta" className={IconBtn} aria-label="Minha conta"><Icone nome="conta" /></Link>
          <Link href="/favoritos" className={`${IconBtn} hidden sm:inline-flex`} aria-label="Favoritos"><Icone nome="coracao" /></Link>
          <Link href="/carrinho" className={IconBtn} aria-label={`Carrinho, ${carrinhoQtd} ${carrinhoQtd === 1 ? "item" : "itens"}`}>
            <Icone nome="sacola" />
            <span aria-hidden className="absolute right-0.5 top-0.5 flex size-5 items-center justify-center rounded-full bg-terracota-escuro text-[11px] font-medium text-creme">{carrinhoQtd}</span>
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
        <nav id={menuId} aria-label="Menu móvel" className="max-h-[70vh] overflow-y-auto border-t border-linha bg-creme lg:hidden">
          <ul className="container-loja py-2">
            {navPrincipal.map((n) =>
              "submenu" in n ? (
                <li key={n.label} className="border-b border-linha">
                  <p className="flex min-h-12 items-center font-medium">{n.label}</p>
                  <ul className="pb-2 pl-3">
                    {categorias.map((c) => (
                      <li key={c.slug}><Link href={`/categorias/${c.slug}`} className="flex min-h-11 items-center text-sm" onClick={() => setMenuAberto(false)}>{c.nome}</Link></li>
                    ))}
                  </ul>
                </li>
              ) : (
                <li key={n.label} className="border-b border-linha last:border-0">
                  <Link href={n.href} className="flex min-h-12 items-center" onClick={() => setMenuAberto(false)}>{n.label}</Link>
                </li>
              ),
            )}
            <li><Link href="/favoritos" className="flex min-h-12 items-center" onClick={() => setMenuAberto(false)}>Favoritos</Link></li>
          </ul>
        </nav>
      )}
    </header>
  );
}
