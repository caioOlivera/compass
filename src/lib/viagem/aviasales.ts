import type { ConsultaVoo, OfertaVoo } from "./tipos";

// Parte pura da integração com a Travelpayouts (Aviasales Data API): montar a consulta, o link
// de busca e ler a resposta. As chamadas de rede ficam em travelpayouts.ts.

export const AVIASALES = "https://www.aviasales.com";

const ddmm = (data: string) => `${data.slice(8, 10)}${data.slice(5, 7)}`;

/** Link de busca do Aviasales: /search/GRU1501LIS30012 (ida 15/01, volta 30/01, 1 adulto, 2 crianças). */
export function linkBuscaAviasales(c: ConsultaVoo): string {
  const ida = c.ida.length === 10 ? c.ida : `${c.ida}-15`;
  const volta = c.volta ? (c.volta.length === 10 ? c.volta : `${c.volta}-15`) : null;
  const adultos = Math.min(Math.max(c.adultos, 1), 9);
  const criancas = Math.min(c.criancas ?? 0, 9);
  return `${AVIASALES}/search/${c.origem}${ddmm(ida)}${c.destino}${volta ? ddmm(volta) : ""}${adultos}${criancas ? criancas : ""}`;
}

/** Parâmetros do GET /aviasales/v3/prices_for_dates. Mercado e moeda sempre explícitos (o padrão é o mercado russo). */
export function parametrosPrecos(c: ConsultaVoo): URLSearchParams {
  return new URLSearchParams({
    origin: c.origem,
    destination: c.destino,
    departure_at: c.ida,
    ...(c.volta ? { return_at: c.volta } : {}),
    one_way: c.volta ? "false" : "true",
    direct: "false",
    currency: "brl",
    market: "br",
    sorting: "price",
    unique: "false",
    limit: "10",
    page: "1",
  });
}

type ItemTP = {
  price?: number;
  airline?: string;
  flight_number?: string | number;
  departure_at?: string;
  return_at?: string;
  transfers?: number;
  duration?: number;
  duration_to?: number;
  link?: string;
};

/** Resposta { success, data[] } → ofertas, da mais barata para a mais cara. */
export function lerPrecos(json: unknown, c: ConsultaVoo): OfertaVoo[] {
  const r = json as { success?: boolean; data?: ItemTP[] } | null;
  if (!r?.success || !Array.isArray(r.data)) return [];
  return r.data
    .filter((d) => typeof d.price === "number" && d.price > 0)
    .map((d) => ({
      provedor: "travelpayouts",
      preco_brl: Math.round(d.price!),
      companhia: d.airline ?? null,
      voo: d.flight_number != null ? `${d.airline ?? ""}${d.flight_number}` : null,
      partida: d.departure_at ?? null,
      chegada_volta: d.return_at ?? null,
      escalas: d.transfers ?? null,
      duracao_min: d.duration_to ?? d.duration ?? null,
      link: d.link ? `${AVIASALES}${d.link.startsWith("/") ? "" : "/"}${d.link}` : linkBuscaAviasales(c),
    }))
    .sort((a, b) => a.preco_brl - b.preco_brl);
}

/** Resposta da API de links de parceiro → URL de afiliado de cada link enviado (ou null). */
export function lerLinksParceiro(json: unknown, quantos: number): (string | null)[] {
  const r = json as { result?: { links?: { url?: string; partner_url?: string; code?: string }[] } } | null;
  const links = r?.result?.links ?? [];
  return Array.from({ length: quantos }, (_, i) => {
    const l = links[i];
    if (!l || (l.code && l.code !== "success")) return null;
    return l.partner_url ?? null;
  });
}
