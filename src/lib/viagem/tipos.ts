// Tipos comuns de passagens e hotéis. Cada provedor converte a resposta dele para estes formatos;
// o resto do Compass não sabe de onde veio o preço.

export type ConsultaVoo = {
  origem: string; // IATA de aeroporto ou de cidade (GRU, SAO)
  destino: string;
  ida: string; // YYYY-MM-DD ou YYYY-MM
  volta?: string | null;
  adultos: number;
  criancas?: number;
};

export type OfertaVoo = {
  provedor: string;
  /** Por adulto, em R$ */
  preco_brl: number;
  companhia: string | null;
  voo: string | null;
  partida: string | null;
  chegada_volta: string | null;
  escalas: number | null;
  duracao_min: number | null;
  /** Página de compra/busca (com afiliado quando o provedor dá) */
  link: string;
};

export type ConsultaHotel = {
  cidade: string;
  checkin: string; // YYYY-MM-DD
  checkout: string;
  adultos: number;
  criancas?: number;
};

export type OfertaHotel = {
  provedor: string;
  nome: string;
  /** Diária de referência, em R$ */
  diaria_brl: number | null;
  total_brl: number | null;
  nota: number | null;
  avaliacoes: number | null;
  estrelas: number | null;
  lat: number | null;
  lng: number | null;
  foto: string | null;
  /** De onde veio a diária (ex.: "Booking.com") */
  fonte_preco: string | null;
  link: string;
};

export interface ProvedorVoos {
  readonly nome: string;
  buscar(c: ConsultaVoo, signal?: AbortSignal): Promise<OfertaVoo[]>;
}

export interface ProvedorHoteis {
  readonly nome: string;
  buscar(c: ConsultaHotel, signal?: AbortSignal): Promise<OfertaHotel[]>;
}

/** Resultado guardado: as ofertas e quando foram cotadas (a data aparece na tela e no PDF). */
export type Cotacao<T> = { provedor: string; ofertas: T[]; cotado_em: string; do_cache: boolean };

export class ProvedorViagemError extends Error {
  constructor(
    readonly provedor: string,
    readonly status: number,
    message: string,
  ) {
    super(message);
    this.name = "ProvedorViagemError";
  }
}
