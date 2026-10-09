"use client";

import { useSyncExternalStore } from "react";
import { Icone } from "./Icones";

const CHAVE = "afeturar:favoritos";
const ouvintes = new Set<() => void>();
let cache: { bruto: string | null; lista: string[] } = { bruto: null, lista: [] };

function ler(): string[] {
  try {
    const bruto = localStorage.getItem(CHAVE);
    if (bruto === cache.bruto) return cache.lista;
    const v = JSON.parse(bruto ?? "[]");
    cache = { bruto, lista: Array.isArray(v) ? v.filter((x): x is string => typeof x === "string").slice(0, 200) : [] };
  } catch { cache = { bruto: null, lista: [] }; }
  return cache.lista;
}
const assinar = (cb: () => void) => { ouvintes.add(cb); window.addEventListener("storage", cb); return () => { ouvintes.delete(cb); window.removeEventListener("storage", cb); }; };

export function useFavoritos() {
  const lista = useSyncExternalStore(assinar, ler, () => cache.lista);
  const alternar = (slug: string) => {
    const atual = ler();
    const nova = atual.includes(slug) ? atual.filter((s) => s !== slug) : [slug, ...atual].slice(0, 200);
    try { localStorage.setItem(CHAVE, JSON.stringify(nova)); } catch { /* armazenamento bloqueado: segue sem salvar */ }
    ouvintes.forEach((f) => f());
  };
  return { lista, alternar };
}

/** Favoritos ficam no aparelho (localStorage) até existir login de cliente. */
export function BotaoFavorito({ slug, nome, className = "" }: { slug: string; nome: string; className?: string }) {
  const { lista, alternar } = useFavoritos();
  const ativo = lista.includes(slug);
  return (
    <button
      type="button" onClick={() => alternar(slug)} aria-pressed={ativo}
      aria-label={ativo ? `Remover ${nome} dos favoritos` : `Favoritar ${nome}`}
      className={`inline-flex size-11 items-center justify-center rounded-full bg-white/90 text-terracota-escuro shadow hover:bg-white ${className}`}
    >
      <svg width="22" height="22" viewBox="0 0 24 24" fill={ativo ? "currentColor" : "none"} stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" aria-hidden><path d="M12 20s-7-4.4-7-10a4 4 0 0 1 7-2.6A4 4 0 0 1 19 10c0 5.6-7 10-7 10z" /></svg>
    </button>
  );
}
export { Icone };
