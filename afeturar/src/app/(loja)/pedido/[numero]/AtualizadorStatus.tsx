"use client";

import { useRouter } from "next/navigation";
import { useEffect } from "react";

/** Enquanto o pedido espera pagamento, consulta o status a cada 5 s e recarrega a página quando mudar. */
export function AtualizadorStatus({ numero, codigo, statusAtual }: { numero: number; codigo: string | null; statusAtual: string }) {
  const router = useRouter();
  useEffect(() => {
    if (statusAtual !== "AGUARDANDO_PAGAMENTO" || !codigo) return;
    let parar = false;
    const id = setInterval(async () => {
      try {
        const r = await fetch(`/api/pedidos/${numero}/status?c=${encodeURIComponent(codigo)}`, { cache: "no-store" });
        if (!r.ok || parar) return;
        const d = (await r.json()) as { status: string };
        if (d.status !== statusAtual) router.refresh();
      } catch { /* tenta de novo no próximo ciclo */ }
    }, 5000);
    return () => { parar = true; clearInterval(id); };
  }, [numero, codigo, statusAtual, router]);
  return null;
}
