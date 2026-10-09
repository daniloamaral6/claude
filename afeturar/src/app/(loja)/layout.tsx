import { AvisoTopo } from "@/components/AvisoTopo";
import { Footer } from "@/components/Footer";
import { Header } from "@/components/Header";
import { WhatsAppButton } from "@/components/WhatsAppButton";

export default function LojaLayout({ children }: { children: React.ReactNode }) {
  return (
    <>
      <AvisoTopo />
      <Header />
      <main id="conteudo" className="loja flex-1">{children}</main>
      <Footer />
      <WhatsAppButton />
    </>
  );
}
