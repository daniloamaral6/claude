import Image from "next/image";

/** Foto real do produto; sem foto, mostra o símbolo da marca discreto (nunca uma imagem inventada). */
export function FotoProduto({ url, alt, sizes, className = "", prioridade = false }: { url: string | null; alt: string; sizes: string; className?: string; prioridade?: boolean }) {
  return (
    <div className={`relative overflow-hidden bg-creme-profundo ${className}`}>
      {url ? (
        <Image src={url} alt={alt} fill sizes={sizes} priority={prioridade} className="object-cover" />
      ) : (
        <Image src="/brand/simbolo-transparente.webp" alt="" aria-hidden fill sizes="160px" className="object-contain p-[22%] opacity-25" />
      )}
    </div>
  );
}
