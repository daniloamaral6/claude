"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { useFavoritos } from "@/components/BotaoFavorito";
import { ProdutoCard } from "@/components/ProdutoCard";
import type { CartaoProduto } from "@/server/catalogo";

export function ListaFavoritos() {
  const { lista } = useFavoritos();
  const chave = lista.join(",");
  const [itens, setItens] = useState<CartaoProduto[] | null>(null);
  const [falhou, setFalhou] = useState(false);

  useEffect(() => {
    if (!chave) return;
    let cancelado = false;
    fetch(`/api/favoritos?slugs=${encodeURIComponent(chave)}`)
      .then((r) => (r.ok ? r.json() : Promise.reject()))
      .then((d: { itens: CartaoProduto[] }) => { if (!cancelado) { setItens(d.itens); setFalhou(false); } })
      .catch(() => { if (!cancelado) setFalhou(true); });
    return () => { cancelado = true; };
  }, [chave]);

  if (falhou) return <p role="alert" className="mt-8 text-sm text-erro">Não foi possível carregar seus favoritos agora. Tente novamente em instantes.</p>;
  if (chave && itens === null) return <p role="status" className="mt-8 text-sm text-marrom-suave">Carregando…</p>;
  const visiveis = (itens ?? []).filter((p) => lista.includes(p.slug)); // some da tela assim que é desfavoritado
  if (visiveis.length === 0) {
    return (
      <div className="mt-8 rounded-[var(--radius-card)] border border-dashed border-linha px-6 py-14 text-center">
        <p className="font-medium">Você ainda não favoritou nenhum produto</p>
        <p className="mt-1 text-sm text-marrom-suave">Toque no coração de um produto para guardá-lo aqui.</p>
        <Link href="/loja" className="btn btn-primary mt-5">Explorar produtos</Link>
      </div>
    );
  }
  return <ul className="mt-6 grid grid-cols-2 gap-x-4 gap-y-8 md:grid-cols-4">{visiveis.map((p) => <li key={p.id}><ProdutoCard p={p} /></li>)}</ul>;
}
