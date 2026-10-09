import { ErroFrete, type OpcaoFrete, type PacoteItem, type ProvedorFrete } from "./tipos";

/**
 * Cotação pelo Melhor Envio (POST /api/v2/me/shipment/calculate).
 * ATENÇÃO: implementado conforme a documentação pública; ainda NÃO validado contra a API real (precisa do token sandbox).
 * Unidades da API: dimensões em cm, peso em kg, valores em reais.
 */
export interface OpcoesMelhorEnvio { token: string; ambiente?: "sandbox" | "producao"; emailContato: string; fetchImpl?: typeof fetch; timeoutMs?: number }

// Mínimos exigidos pelos Correios para qualquer pacote (a API recusa/ajusta abaixo disso).
const MIN = { comprimento: 16, largura: 11, altura: 2, pesoKg: 0.1 };

export function melhorEnvio(o: OpcoesMelhorEnvio): ProvedorFrete {
  const base = o.ambiente === "producao" ? "https://melhorenvio.com.br" : "https://sandbox.melhorenvio.com.br";
  const f = o.fetchImpl ?? fetch;
  return {
    nome: "melhor_envio",
    async cotar(origemCep, destinoCep, itens: PacoteItem[]): Promise<OpcaoFrete[]> {
      const corpo = {
        from: { postal_code: origemCep }, to: { postal_code: destinoCep },
        products: itens.map((i) => ({
          id: i.id,
          width: Math.max(MIN.largura, Math.ceil(i.larguraCm)), height: Math.max(MIN.altura, Math.ceil(i.alturaCm)), length: Math.max(MIN.comprimento, Math.ceil(i.comprimentoCm)),
          weight: Math.max(MIN.pesoKg, Number(i.pesoKg.toFixed(3))), insurance_value: Number((i.valorCentavos / 100).toFixed(2)), quantity: i.quantidade,
        })),
        options: { receipt: false, own_hand: false },
      };
      let resp: Response;
      try {
        resp = await f(`${base}/api/v2/me/shipment/calculate`, {
          method: "POST",
          headers: { Authorization: `Bearer ${o.token}`, Accept: "application/json", "Content-Type": "application/json", "User-Agent": `Afeturar (${o.emailContato})` },
          body: JSON.stringify(corpo), signal: AbortSignal.timeout(o.timeoutMs ?? 10_000),
        });
      } catch {
        throw new ErroFrete("Não foi possível consultar o frete agora. Tente novamente em instantes.");
      }
      if (!resp.ok) {
        console.error("Melhor Envio respondeu", resp.status);
        throw new ErroFrete("Não foi possível calcular o frete para este CEP agora.");
      }
      const lista = (await resp.json().catch(() => null)) as unknown;
      if (!Array.isArray(lista)) throw new ErroFrete("Resposta inesperada do serviço de frete.");
      const opcoes: OpcaoFrete[] = [];
      for (const s of lista as Record<string, unknown>[]) {
        if (s.error || s.price == null) continue; // serviço indisponível para este CEP/pacote
        const preco = Math.round(Number(s.custom_price ?? s.price) * 100);
        const prazo = Number(s.custom_delivery_time ?? s.delivery_time);
        if (!Number.isFinite(preco) || preco < 0 || !Number.isFinite(prazo) || prazo < 0) continue;
        opcoes.push({ id: `melhor_envio:${s.id}`, nome: String(s.name ?? "Entrega"), empresa: String((s.company as { name?: string } | undefined)?.name ?? ""), precoCentavos: preco, prazoDias: Math.ceil(prazo) });
      }
      return opcoes.sort((a, b) => a.precoCentavos - b.precoCentavos || a.prazoDias - b.prazoDias);
    },
  };
}
