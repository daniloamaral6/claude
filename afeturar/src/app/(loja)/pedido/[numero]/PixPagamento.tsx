"use client";

import { useEffect, useState } from "react";

export function PixPagamento({ copiaECola, qrBase64, expiraEm }: { copiaECola: string; qrBase64: string | null; expiraEm: string | null }) {
  const [copiado, setCopiado] = useState(false);
  const [restante, setRestante] = useState<number | null>(null);
  useEffect(() => {
    if (!expiraEm) return;
    const alvo = new Date(expiraEm).getTime();
    const tick = () => setRestante(Math.max(0, Math.floor((alvo - Date.now()) / 1000)));
    tick(); const id = setInterval(tick, 1000); return () => clearInterval(id);
  }, [expiraEm]);

  async function copiar() {
    try { await navigator.clipboard.writeText(copiaECola); setCopiado(true); setTimeout(() => setCopiado(false), 3000); } catch { /* o campo abaixo permite copiar à mão */ }
  }
  const qrSeguro = qrBase64 && /^[A-Za-z0-9+/=]+$/.test(qrBase64) ? `data:image/png;base64,${qrBase64}` : null; // só base64 puro vira imagem

  return (
    <section aria-labelledby="pix-t" className="rounded-[var(--radius-card)] border border-terracota-escuro bg-white p-5">
      <h2 id="pix-t" className="text-xl">Pague com Pix</h2>
      <p className="mt-1 text-sm text-marrom-suave">Abra o app do seu banco, escolha Pix e leia o QR Code ou use o código “copia e cola”. A confirmação é automática.</p>
      <div className="mt-4 flex flex-col items-center gap-4 sm:flex-row sm:items-start">
        {qrSeguro && (
          // QR Code vem em base64 do provedor: não passa pelo otimizador de imagens
          // eslint-disable-next-line @next/next/no-img-element
          <img src={qrSeguro} alt="QR Code do Pix" width={192} height={192} className="size-48 rounded-lg border border-linha" />
        )}
        <div className="w-full flex-1">
          <label htmlFor="pix-codigo" className="text-sm font-medium">Pix copia e cola</label>
          <textarea id="pix-codigo" readOnly rows={4} value={copiaECola} className="campo mt-1 break-all py-2 text-xs" onFocus={(e) => e.currentTarget.select()} />
          <button type="button" onClick={copiar} className="btn btn-primary mt-2">{copiado ? "Código copiado!" : "Copiar código"}</button>
          <span role="status" className="sr-only">{copiado ? "Código copiado" : ""}</span>
          {restante !== null && <p className="mt-3 text-sm text-marrom-suave">{restante > 0 ? <>Este código vale por mais <strong>{Math.floor(restante / 60)}:{String(restante % 60).padStart(2, "0")}</strong>.</> : "O código expirou. Se não pagou, faça um novo pedido."}</p>}
        </div>
      </div>
    </section>
  );
}
