import { AvisoTopo } from "@/components/AvisoTopo";
import { Footer } from "@/components/Footer";
import { Header } from "@/components/Header";
import { WhatsAppButton } from "@/components/WhatsAppButton";
import { listarCategoriasPublicas } from "@/server/catalogo";
import { contarItens } from "@/server/carrinho";
import { tokenDoCarrinho } from "@/server/carrinho-cookie";
import { configuracoesPublicas } from "@/server/loja-config";

export const dynamic = "force-dynamic";

export default async function LojaLayout({ children }: { children: React.ReactNode }) {
  const [categorias, config, qtd] = await Promise.all([listarCategoriasPublicas(), configuracoesPublicas(), tokenDoCarrinho().then(contarItens)]);
  return (
    <>
      <AvisoTopo freteGratisCentavos={config.freteGratisCentavos} />
      <Header categorias={categorias} carrinhoQtd={qtd} />
      <main id="conteudo" className="loja flex-1">{children}</main>
      <Footer categorias={categorias} config={config} />
      <WhatsAppButton numero={config.whatsapp} />
    </>
  );
}
