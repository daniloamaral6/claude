"use client";

import { useRouter } from "next/navigation";
import { useCallback, useEffect, useRef, useState } from "react";
import { formatarBRL } from "@/lib/moeda";
import { cepValido, cpfValido, emailValido, formatarCep, formatarCpf, somenteDigitos, telefoneValido, UFS } from "@/lib/validacoes";
import { aplicarCupom, buscarCep, cotarFrete, finalizarPedido } from "./actions";

interface Opcao { id: string; nome: string; empresa: string; precoCentavos: number; precoOriginalCentavos: number; gratis: boolean; prazoDias: number }
interface Props {
  subtotalCentavos: number; linhas: { nome: string; quantidade: number; subtotalCentavos: number }[];
  freteDisponivel: boolean; pagamentoDisponivel: boolean; modoSimulado: boolean; chavePublicaMP: string | null; whatsapp: string | null; temSobEncomenda: boolean;
  inicial: Record<"email" | "nome" | "destinatario" | "cep" | "logradouro" | "numero" | "complemento" | "bairro" | "cidade" | "uf", string>;
}
type Campos = Props["inicial"] & { telefone: string; cpf: string };

interface MercadoPagoSDK { bricks(): { create(tipo: string, id: string, cfg: unknown): Promise<{ unmount(): void }> } }
declare global { interface Window { MercadoPago?: new (chave: string, opts: { locale: string }) => MercadoPagoSDK } }

const novaChave = () => (typeof crypto !== "undefined" && crypto.randomUUID ? crypto.randomUUID() : `${Date.now()}-${Math.random().toString(36).slice(2)}-${Math.random().toString(36).slice(2)}`).replace(/[^A-Za-z0-9_-]/g, "");

export function CheckoutForm(p: Props) {
  const router = useRouter();
  const [f, setF] = useState<Campos>({ ...p.inicial, telefone: "", cpf: "", cep: formatarCep(p.inicial.cep) });
  const [erros, setErros] = useState<Record<string, string>>({});
  const [opcoes, setOpcoes] = useState<Opcao[]>([]);
  const [freteId, setFreteId] = useState<string | null>(null);
  const [freteErro, setFreteErro] = useState<string | null>(null);
  const [carregandoFrete, setCarregandoFrete] = useState(false);
  const [prazoPreparo, setPrazoPreparo] = useState(0);
  const [cupomTxt, setCupomTxt] = useState("");
  const [cupom, setCupom] = useState<{ codigo: string; descontoCentavos: number; freteGratis: boolean } | null>(null);
  const [cupomErro, setCupomErro] = useState<string | null>(null);
  const [metodo, setMetodo] = useState<"PIX" | "CARTAO">("PIX");
  const [aceito, setAceito] = useState(false);
  const [enviando, setEnviando] = useState(false);
  const [erroGeral, setErroGeral] = useState<string | null>(null);
  const chave = useRef(novaChave());

  const set = (k: keyof Campos) => (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => setF((x) => ({ ...x, [k]: e.target.value }));
  const opcao = opcoes.find((o) => o.id === freteId) ?? null;
  const desconto = cupom?.descontoCentavos ?? 0;
  const total = p.subtotalCentavos - desconto + (opcao?.precoCentavos ?? 0);

  const cotar = useCallback(async (cep: string, cupomCodigo: string | null) => {
    setCarregandoFrete(true); setFreteErro(null);
    const r = await cotarFrete({ cep, cupom: cupomCodigo });
    setCarregandoFrete(false);
    if (!r.ok) { setOpcoes([]); setFreteId(null); setFreteErro(r.erro); return; }
    setOpcoes(r.opcoes as Opcao[]); setPrazoPreparo(r.prazoPreparoDias);
    setFreteId((atual) => (atual && r.opcoes.some((o) => o.id === atual) ? atual : r.opcoes[0]?.id ?? null));
  }, []);

  async function aoMudarCep(valor: string) {
    const formatado = formatarCep(valor);
    setF((x) => ({ ...x, cep: formatado }));
    if (!cepValido(formatado)) { setOpcoes([]); setFreteId(null); return; }
    void cotar(formatado, cupom?.codigo ?? null);
    const end = await buscarCep(formatado);
    if (end.ok) setF((x) => ({ ...x, logradouro: x.logradouro || end.logradouro, bairro: x.bairro || end.bairro, cidade: x.cidade || end.cidade, uf: x.uf || end.uf }));
  }

  async function aoAplicarCupom() {
    setCupomErro(null);
    if (!cupomTxt.trim()) return;
    const r = await aplicarCupom(cupomTxt);
    if (!r.ok) { setCupom(null); setCupomErro(r.erro); return; }
    setCupom({ codigo: r.codigo, descontoCentavos: r.descontoCentavos, freteGratis: r.freteGratis });
    if (cepValido(f.cep)) void cotar(f.cep, r.codigo);
  }
  function removerCupom() { setCupom(null); setCupomTxt(""); if (cepValido(f.cep)) void cotar(f.cep, null); }

  function validar(): Record<string, string> {
    const e: Record<string, string> = {};
    if (!emailValido(f.email)) e.email = "Informe um e-mail válido.";
    if (f.nome.trim().length < 3) e.nome = "Informe seu nome completo.";
    if (!telefoneValido(f.telefone)) e.telefone = "Informe o telefone com DDD.";
    if (!cpfValido(f.cpf)) e.cpf = "CPF inválido.";
    if (!cepValido(f.cep)) e.cep = "Informe um CEP válido.";
    if (f.logradouro.trim().length < 2) e.logradouro = "Informe a rua.";
    if (!f.numero.trim()) e.numero = "Informe o número.";
    if (f.bairro.trim().length < 2) e.bairro = "Informe o bairro.";
    if (f.cidade.trim().length < 2) e.cidade = "Informe a cidade.";
    if (!(UFS as readonly string[]).includes(f.uf.toUpperCase())) e.uf = "Escolha o estado.";
    if (!freteId) e.frete = "Escolha uma opção de entrega.";
    if (!aceito) e.aceito = "É preciso aceitar os termos.";
    return e;
  }

  async function enviar(pagamento: unknown) {
    const e = validar(); setErros(e);
    if (Object.keys(e).length) { setErroGeral("Confira os campos destacados."); document.getElementById("erro-geral")?.focus(); return false; }
    setEnviando(true); setErroGeral(null);
    const r = await finalizarPedido({
      contato: { email: f.email, nome: f.nome, telefone: f.telefone, cpf: f.cpf },
      entrega: { destinatario: f.destinatario || f.nome, cep: f.cep, logradouro: f.logradouro, numero: f.numero, complemento: f.complemento, bairro: f.bairro, cidade: f.cidade, uf: f.uf },
      freteId, cupom: cupom?.codigo ?? null, pagamento, aceitouTermos: aceito, chaveIdempotencia: chave.current,
    });
    if (r.ok) { router.push(r.url); return true; }
    chave.current = novaChave(); // nova tentativa = novo pedido (a anterior falhou e foi desfeita)
    setEnviando(false); setErroGeral(r.erro); if (r.erros) setErros((x) => ({ ...x, ...r.erros }));
    document.getElementById("erro-geral")?.focus();
    return false;
  }

  // ───── cartão (Brick do Mercado Pago): número e CVV ficam no iframe do Mercado Pago, nunca no nosso site ─────
  const brickRef = useRef<{ unmount(): void } | null>(null);
  const enviarRef = useRef(enviar);
  const emailRef = useRef(f.email);
  useEffect(() => { enviarRef.current = enviar; emailRef.current = f.email; }); // callbacks do Brick sempre veem os dados atuais
  useEffect(() => {
    if (metodo !== "CARTAO" || !p.chavePublicaMP || !opcao) return;
    let cancelado = false;
    (async () => {
      if (!window.MercadoPago) {
        await new Promise<void>((ok, falha) => { const s = document.createElement("script"); s.src = "https://sdk.mercadopago.com/js/v2"; s.onload = () => ok(); s.onerror = () => falha(); document.head.appendChild(s); }).catch(() => setErroGeral("Não foi possível carregar o pagamento por cartão. Use o Pix ou tente de novo."));
      }
      if (cancelado || !window.MercadoPago) return;
      brickRef.current?.unmount();
      const mp = new window.MercadoPago(p.chavePublicaMP!, { locale: "pt-BR" });
      brickRef.current = await mp.bricks().create("cardPayment", "brick-cartao", {
        initialization: { amount: total / 100, payer: { email: emailRef.current } },
        customization: { paymentMethods: { maxInstallments: 12 }, visual: { style: { theme: "default" } } },
        callbacks: {
          onReady: () => {},
          onError: () => setErroGeral("Confira os dados do cartão."),
          onSubmit: (d: { token: string; payment_method_id: string; issuer_id?: string | number; installments: number }) =>
            enviarRef.current({ metodo: "CARTAO", token: d.token, metodoId: d.payment_method_id, emissorId: d.issuer_id ? String(d.issuer_id) : null, parcelas: Number(d.installments) || 1 }).then((ok) => (ok ? undefined : Promise.reject())),
        },
      });
    })();
    return () => { cancelado = true; brickRef.current?.unmount(); brickRef.current = null; };
    // recria o formulário do cartão quando o valor muda (frete/cupom)
  }, [metodo, p.chavePublicaMP, total, opcao]);

  const campo = (id: keyof Campos, rotulo: string, extra: React.InputHTMLAttributes<HTMLInputElement> = {}) => (
    <div>
      <label htmlFor={`f-${id}`} className="mb-1 block text-sm font-medium">{rotulo}</label>
      <input id={`f-${id}`} name={id} value={f[id]} onChange={set(id)} aria-invalid={!!erros[id]} aria-describedby={erros[id] ? `f-${id}-erro` : undefined} className="campo" {...extra} />
      {erros[id] && <p id={`f-${id}-erro`} role="alert" className="mt-1 text-sm text-erro">{erros[id]}</p>}
    </div>
  );

  if (!p.pagamentoDisponivel || !p.freteDisponivel) {
    return (
      <section className="container-loja max-w-xl py-20 text-center">
        <h1 className="text-3xl tracking-wide">Finalizar compra</h1>
        <p className="mt-4 text-marrom-suave">O pagamento online ainda não está disponível. {p.whatsapp ? "Fale com a gente para concluir seu pedido." : "Volte em breve."}</p>
        {p.whatsapp && <a href={`https://wa.me/${p.whatsapp}`} target="_blank" rel="noopener noreferrer" className="btn btn-primary mt-6">Falar pelo WhatsApp</a>}
      </section>
    );
  }

  return (
    <div className="container-loja py-8 sm:py-12">
      <h1 className="text-3xl tracking-wide sm:text-4xl">Finalizar compra</h1>
      <p id="erro-geral" tabIndex={-1} role="alert" className={erroGeral ? "mt-4 rounded-lg border border-erro bg-white px-4 py-3 text-sm text-erro" : "sr-only"}>{erroGeral}</p>
      <form noValidate onSubmit={(e) => { e.preventDefault(); if (metodo === "PIX") void enviar({ metodo: "PIX" }); }} className="mt-8 grid gap-10 lg:grid-cols-[1fr_380px]">
        <div className="space-y-10">
          <fieldset className="space-y-4">
            <legend className="text-xl">1. Seus dados</legend>
            {campo("email", "E-mail", { type: "email", autoComplete: "email", inputMode: "email" })}
            <div className="grid gap-4 sm:grid-cols-2">
              {campo("nome", "Nome completo", { autoComplete: "name" })}
              {campo("telefone", "Telefone com DDD", { type: "tel", autoComplete: "tel", inputMode: "tel", placeholder: "(11) 99999-0000" })}
            </div>
            <div className="max-w-xs">{campo("cpf", "CPF", { inputMode: "numeric", autoComplete: "off", placeholder: "000.000.000-00", onChange: (e) => setF((x) => ({ ...x, cpf: formatarCpf(somenteDigitos(e.target.value).slice(0, 11)) || somenteDigitos(e.target.value) })) })}
              <p className="mt-1 text-xs text-marrom-suave">Exigido pela operadora de pagamento e usado na nota fiscal. Não é exibido na loja.</p></div>
          </fieldset>

          <fieldset className="space-y-4">
            <legend className="text-xl">2. Entrega</legend>
            <div className="max-w-xs">{campo("cep", "CEP", { inputMode: "numeric", autoComplete: "postal-code", placeholder: "00000-000", maxLength: 9, onChange: (e) => void aoMudarCep(e.target.value) })}</div>
            {campo("destinatario", "Quem recebe (se for outra pessoa)", { autoComplete: "shipping name" })}
            {campo("logradouro", "Rua / Avenida", { autoComplete: "address-line1" })}
            <div className="grid gap-4 sm:grid-cols-3">
              {campo("numero", "Número", { autoComplete: "off" })}
              {campo("complemento", "Complemento (opcional)", { autoComplete: "address-line2" })}
              {campo("bairro", "Bairro", { autoComplete: "address-level3" })}
            </div>
            <div className="grid gap-4 sm:grid-cols-[1fr_120px]">
              {campo("cidade", "Cidade", { autoComplete: "address-level2" })}
              <div>
                <label htmlFor="f-uf" className="mb-1 block text-sm font-medium">Estado</label>
                <select id="f-uf" value={f.uf.toUpperCase()} onChange={set("uf")} aria-invalid={!!erros.uf} className="campo"><option value="">UF</option>{UFS.map((u) => <option key={u}>{u}</option>)}</select>
                {erros.uf && <p role="alert" className="mt-1 text-sm text-erro">{erros.uf}</p>}
              </div>
            </div>

            <div aria-live="polite">
              <p className="text-sm font-medium">Forma de entrega</p>
              {carregandoFrete && <p className="mt-2 text-sm text-marrom-suave">Calculando frete…</p>}
              {!carregandoFrete && !cepValido(f.cep) && <p className="mt-2 text-sm text-marrom-suave">Informe o CEP para ver as opções de entrega.</p>}
              {freteErro && <p role="alert" className="mt-2 text-sm text-erro">{freteErro}</p>}
              {opcoes.length > 0 && (
                <ul className="mt-2 space-y-2">
                  {opcoes.map((o) => (
                    <li key={o.id}>
                      <label className={`flex cursor-pointer items-center gap-3 rounded-[var(--radius-card)] border p-4 ${freteId === o.id ? "border-terracota-escuro bg-white" : "border-linha"}`}>
                        <input type="radio" name="frete" value={o.id} checked={freteId === o.id} onChange={() => setFreteId(o.id)} className="size-5 accent-terracota-escuro" />
                        <span className="flex-1"><span className="block font-medium">{o.nome}{o.empresa ? ` · ${o.empresa}` : ""}</span>
                          <span className="text-sm text-marrom-suave">Chega em até {o.prazoDias + prazoPreparo} dias úteis{prazoPreparo > 0 ? ` (preparo de ${prazoPreparo} + entrega de ${o.prazoDias})` : ""}</span></span>
                        <span className="font-semibold">{o.gratis ? <span className="text-terracota-escuro">Grátis</span> : formatarBRL(o.precoCentavos)}</span>
                      </label>
                    </li>
                  ))}
                </ul>
              )}
              {erros.frete && <p role="alert" className="mt-2 text-sm text-erro">{erros.frete}</p>}
              {p.temSobEncomenda && <p className="mt-2 text-xs text-marrom-suave">O prazo conta a partir da aprovação do pagamento e inclui o preparo dos itens sob encomenda.</p>}
            </div>
          </fieldset>

          <fieldset className="space-y-3">
            <legend className="text-xl">3. Pagamento</legend>
            {([["PIX", "Pix", "Aprovação em instantes. O QR Code aparece na próxima tela."], ["CARTAO", "Cartão de crédito", "Pago com segurança pelo Mercado Pago, em até 12x."]] as const).map(([v, t, d]) => (
              <label key={v} className={`flex cursor-pointer gap-3 rounded-[var(--radius-card)] border p-4 ${metodo === v ? "border-terracota-escuro bg-white" : "border-linha"}`}>
                <input type="radio" name="pagamento" value={v} checked={metodo === v} onChange={() => setMetodo(v)} className="mt-1 size-5 accent-terracota-escuro" />
                <span><span className="block font-medium">{t}</span><span className="text-sm text-marrom-suave">{d}</span></span>
              </label>
            ))}
            {metodo === "CARTAO" && (
              p.modoSimulado ? (
                <div className="rounded-[var(--radius-card)] border border-dashed border-terracota-escuro p-4 text-sm">
                  <p className="font-medium">Modo de teste (não existe em produção)</p>
                  <div className="mt-2 flex flex-wrap gap-2">
                    <button type="button" disabled={enviando} className="btn btn-secondary" onClick={() => void enviar({ metodo: "CARTAO", token: "aprovar_simulado", metodoId: "visa", parcelas: 1 })}>Cartão de teste: aprovar</button>
                    <button type="button" disabled={enviando} className="btn btn-secondary" onClick={() => void enviar({ metodo: "CARTAO", token: "recusar", metodoId: "visa", parcelas: 1 })}>Cartão de teste: recusar</button>
                  </div>
                </div>
              ) : !opcao ? <p className="text-sm text-marrom-suave">Escolha a forma de entrega para ver o formulário do cartão.</p>
                : !p.chavePublicaMP ? <p role="alert" className="text-sm text-erro">Pagamento por cartão indisponível no momento. Use o Pix.</p>
                : <div id="brick-cartao" aria-label="Dados do cartão" />
            )}
          </fieldset>
        </div>

        <aside aria-label="Resumo do pedido" className="h-fit space-y-4 rounded-[var(--radius-card)] border border-linha bg-white p-5 lg:sticky lg:top-24">
          <h2 className="text-xl">Resumo</h2>
          <ul className="space-y-1 text-sm">{p.linhas.map((l) => <li key={l.nome + l.quantidade} className="flex justify-between gap-3"><span>{l.quantidade}× {l.nome}</span><span>{formatarBRL(l.subtotalCentavos)}</span></li>)}</ul>
          <div>
            <label htmlFor="cupom" className="text-sm font-medium">Cupom de desconto</label>
            {cupom ? (
              <p className="mt-1 flex items-center justify-between text-sm"><span>Cupom <strong>{cupom.codigo}</strong> aplicado</span><button type="button" onClick={removerCupom} className="min-h-11 underline underline-offset-4">Remover</button></p>
            ) : (
              <div className="mt-1 flex gap-2"><input id="cupom" value={cupomTxt} onChange={(e) => { setCupomTxt(e.target.value); setCupomErro(null); }} onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); void aoAplicarCupom(); } }} aria-invalid={!!cupomErro} className="campo" autoComplete="off" /><button type="button" onClick={() => void aoAplicarCupom()} className="btn btn-secondary">Aplicar</button></div>
            )}
            {cupomErro && <p role="alert" className="mt-1 text-sm text-erro">{cupomErro}</p>}
          </div>
          <dl className="space-y-2 border-t border-linha pt-4 text-sm">
            <div className="flex justify-between"><dt>Subtotal</dt><dd>{formatarBRL(p.subtotalCentavos)}</dd></div>
            {desconto > 0 && <div className="flex justify-between text-terracota-escuro"><dt>Desconto</dt><dd>− {formatarBRL(desconto)}</dd></div>}
            <div className="flex justify-between"><dt>Frete</dt><dd>{opcao ? (opcao.gratis ? "Grátis" : formatarBRL(opcao.precoCentavos)) : <span className="text-marrom-suave">Informe o CEP</span>}</dd></div>
            <div className="flex justify-between border-t border-linha pt-3 text-base font-semibold"><dt>Total</dt><dd>{formatarBRL(total)}</dd></div>
          </dl>
          <div>
            <label className="flex items-start gap-3 text-sm"><input type="checkbox" checked={aceito} onChange={(e) => setAceito(e.target.checked)} aria-invalid={!!erros.aceito} className="mt-1 size-5 shrink-0 accent-terracota-escuro" />
              <span>Li e concordo com os <a href="/termos-de-uso" target="_blank" className="underline">termos de uso</a>, a <a href="/politica-de-privacidade" target="_blank" className="underline">política de privacidade</a> e a <a href="/trocas-e-devolucoes" target="_blank" className="underline">política de trocas</a>.</span></label>
            {erros.aceito && <p role="alert" className="mt-1 text-sm text-erro">{erros.aceito}</p>}
          </div>
          {metodo === "PIX" ? <button type="submit" disabled={enviando} className="btn btn-primary w-full">{enviando ? "Gerando seu Pix…" : "Pagar com Pix"}</button>
            : <p className="text-xs text-marrom-suave">Preencha os dados do cartão ao lado para concluir.</p>}
          <p className="text-xs text-marrom-suave">Os valores são conferidos de novo no servidor antes da cobrança. {enviando && <span role="status">Processando…</span>}</p>
        </aside>
      </form>
    </div>
  );
}
