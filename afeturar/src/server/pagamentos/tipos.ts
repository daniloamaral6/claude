export type StatusPagamentoProv = "PENDENTE" | "APROVADO" | "RECUSADO" | "CANCELADO" | "ESTORNADO";

export interface DadosPagador { email: string; nome: string; cpf: string }
export interface PedidoParaPagar {
  pedidoId: string; numero: number; valorCentavos: number; descricao: string; pagador: DadosPagador;
  /** URL pública que receberá as notificações (webhook). */
  urlNotificacao: string | null;
  /** Chave única da tentativa (evita cobrança duplicada se a requisição for repetida). */
  chaveIdempotencia: string;
}
export interface ResultadoPagamento {
  idExterno: string; status: StatusPagamentoProv; detalhe: string | null;
  pix?: { copiaECola: string; qrBase64: string | null; ticketUrl: string | null; expiraEm: Date | null };
}
export interface ConsultaPagamento { idExterno: string; status: StatusPagamentoProv; detalhe: string | null; valorCentavos: number; moeda: string; referenciaExterna: string | null; metodo: "PIX" | "CARTAO" }
export interface DadosCartao { token: string; metodoId: string; emissorId?: string | null; parcelas: number }

export interface ProvedorPagamento {
  nome: string;
  criarPix(p: PedidoParaPagar, expiraEm: Date): Promise<ResultadoPagamento>;
  criarCartao(p: PedidoParaPagar, c: DadosCartao): Promise<ResultadoPagamento>;
  consultar(idExterno: string): Promise<ConsultaPagamento>;
}
export class ErroPagamento extends Error {}
