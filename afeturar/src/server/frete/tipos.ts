export interface PacoteItem {
  id: string;
  larguraCm: number; alturaCm: number; comprimentoCm: number; pesoKg: number;
  /** Valor declarado (seguro) por unidade, em centavos. */
  valorCentavos: number; quantidade: number;
}
export interface OpcaoFrete {
  /** Identificador estável do serviço no provedor, ex.: "melhor_envio:1". É o que o checkout devolve ao escolher. */
  id: string;
  nome: string; empresa: string;
  precoCentavos: number;
  /** Dias úteis de TRANSPORTE (o preparo é somado à parte). */
  prazoDias: number;
}
export interface ProvedorFrete {
  nome: string;
  cotar(origemCep: string, destinoCep: string, itens: PacoteItem[]): Promise<OpcaoFrete[]>;
}
export class ErroFrete extends Error {}
