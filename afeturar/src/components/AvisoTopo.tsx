import { avisosTopo } from "@/lib/site";
import { Icone } from "./Icones";

export function AvisoTopo() {
  return (
    <div className="bg-marrom text-creme">
      <ul className="container-loja flex min-h-10 items-center justify-center gap-x-8 py-2 text-xs sm:justify-between">
        {avisosTopo.map((a, i) => (
          <li key={a.texto} className={`items-center gap-2 ${i === 0 ? "flex" : "hidden sm:flex"}`}>
            <Icone nome={a.icone} tamanho={16} />
            {a.texto}
          </li>
        ))}
      </ul>
    </div>
  );
}
