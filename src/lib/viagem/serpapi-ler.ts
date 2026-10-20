import type { ConsultaHotel, ConsultaVoo, OfertaHotel, OfertaVoo } from "./tipos";

// Parte pura da SerpApi (Google Flights e Google Hotels): parâmetros e leitura das respostas.

export function parametrosVoo(c: ConsultaVoo): Record<string, string> {
  return {
    engine: "google_flights",
    departure_id: c.origem,
    arrival_id: c.destino,
    outbound_date: c.ida,
    ...(c.volta ? { return_date: c.volta, type: "1" } : { type: "2" }),
    adults: String(c.adultos),
    ...(c.criancas ? { children: String(c.criancas) } : {}),
    currency: "BRL",
    hl: "pt-br",
    gl: "br",
  };
}

/** Busca no Google Flights com rota, datas e passageiros já preenchidos (sem afiliado). */
export function linkGoogleFlights(c: ConsultaVoo): string {
  const pessoas = c.adultos + (c.criancas ?? 0);
  const q = `Voos de ${c.origem} para ${c.destino} em ${c.ida}${c.volta ? ` volta ${c.volta}` : " só ida"}${pessoas > 1 ? ` ${pessoas} passageiros` : ""}`;
  return `https://www.google.com/travel/flights?${new URLSearchParams({ q, hl: "pt-BR", gl: "BR", curr: "BRL" })}`;
}

type VooSerp = {
  price?: number;
  total_duration?: number;
  layovers?: unknown[];
  flights?: { airline?: string; flight_number?: string; departure_airport?: { time?: string } }[];
};

/** O Google mostra o total do grupo; `pessoas` normaliza para o preço por pessoa, como na Travelpayouts. */
export function lerVoos(json: unknown, pessoas = 1): OfertaVoo[] {
  const r = json as { best_flights?: VooSerp[]; other_flights?: VooSerp[]; search_metadata?: { google_flights_url?: string } } | null;
  if (!r) return [];
  const link = r.search_metadata?.google_flights_url ?? "https://www.google.com/travel/flights?hl=pt-BR&curr=BRL";
  return [...(r.best_flights ?? []), ...(r.other_flights ?? [])]
    .filter((v) => typeof v.price === "number" && v.price > 0)
    .map((v) => ({
      provedor: "serpapi",
      preco_brl: Math.round(v.price! / Math.max(pessoas, 1)),
      companhia: v.flights?.[0]?.airline ?? null,
      voo: v.flights?.[0]?.flight_number ?? null,
      partida: v.flights?.[0]?.departure_airport?.time ?? null,
      chegada_volta: null,
      escalas: Array.isArray(v.layovers) ? v.layovers.length : 0,
      duracao_min: v.total_duration ?? null,
      link,
    }))
    .sort((a, b) => a.preco_brl - b.preco_brl);
}

export function parametrosHotel(c: ConsultaHotel): Record<string, string> {
  return {
    engine: "google_hotels",
    q: `Hotéis em ${c.cidade}`,
    check_in_date: c.checkin,
    check_out_date: c.checkout,
    adults: String(c.adultos),
    ...(c.criancas ? { children: String(c.criancas) } : {}),
    currency: "BRL",
    hl: "pt-br",
    gl: "br",
  };
}

type HotelSerp = {
  type?: string;
  name?: string;
  link?: string;
  gps_coordinates?: { latitude?: number; longitude?: number };
  rate_per_night?: { extracted_lowest?: number };
  total_rate?: { extracted_lowest?: number };
  prices?: { source?: string; rate_per_night?: { extracted_lowest?: number } }[];
  overall_rating?: number;
  reviews?: number;
  extracted_hotel_class?: number;
  images?: { thumbnail?: string }[];
};

/** Diária do próprio Booking.com quando aparece (é a loja do link de afiliado); senão, a menor. */
export function lerHoteis(json: unknown, c: ConsultaHotel, link: (nome: string) => string): OfertaHotel[] {
  const r = json as { properties?: HotelSerp[] } | null;
  return (r?.properties ?? [])
    .filter((h) => h.name && (h.type ?? "hotel").toLowerCase() !== "vacation rental")
    .map((h) => {
      const booking = h.prices?.find((p) => p.source?.toLowerCase().includes("booking"))?.rate_per_night?.extracted_lowest;
      const diaria = booking ?? h.rate_per_night?.extracted_lowest ?? null;
      return {
        provedor: "serpapi",
        nome: h.name!,
        diaria_brl: diaria != null ? Math.round(diaria) : null,
        total_brl: h.total_rate?.extracted_lowest != null ? Math.round(h.total_rate.extracted_lowest) : null,
        nota: h.overall_rating ?? null,
        avaliacoes: h.reviews ?? null,
        estrelas: h.extracted_hotel_class ?? null,
        lat: h.gps_coordinates?.latitude ?? null,
        lng: h.gps_coordinates?.longitude ?? null,
        foto: h.images?.[0]?.thumbnail ?? null,
        fonte_preco: booking != null ? "Booking.com" : "Google Hotels",
        link: link(`${h.name}, ${c.cidade}`),
      };
    });
}

const FAIXA: Record<string, [number, number]> = { economico: [1, 3], medio: [3, 4], conforto: [4, 4], luxo: [5, 5] };

/**
 * Até 3 hotéis da faixa de orçamento: bem avaliados (nota ≥ 4 quando houver opções), com preço,
 * um mais em conta, um equilibrado e o mais bem avaliado.
 */
export function escolherHoteis(ofertas: OfertaHotel[], orcamento: string, quantos = 3): OfertaHotel[] {
  const [min, max] = FAIXA[orcamento] ?? FAIXA.medio;
  const comPreco = ofertas.filter((h) => h.diaria_brl != null);
  const naFaixa = comPreco.filter((h) => h.estrelas == null || (h.estrelas >= min && h.estrelas <= max));
  const base = naFaixa.length >= quantos ? naFaixa : comPreco;
  const boas = base.filter((h) => (h.nota ?? 0) >= 4);
  const pool = boas.length >= quantos ? boas : base;
  if (pool.length <= quantos) return pool;

  const porPreco = [...pool].sort((a, b) => a.diaria_brl! - b.diaria_brl!);
  const porNota = [...pool].sort((a, b) => (b.nota ?? 0) - (a.nota ?? 0) || (b.avaliacoes ?? 0) - (a.avaliacoes ?? 0));
  const escolhidos: OfertaHotel[] = [];
  const add = (h?: OfertaHotel) => h && !escolhidos.includes(h) && escolhidos.push(h);
  add(porPreco[0]);
  add(porPreco[Math.floor(porPreco.length / 2)]);
  add(porNota[0]);
  for (const h of porNota) if (escolhidos.length < quantos) add(h);
  return escolhidos.slice(0, quantos).sort((a, b) => a.diaria_brl! - b.diaria_brl!);
}

/** Busca do Booking pelo nome do hotel e datas (vira link de afiliado pela Travelpayouts quando configurada). */
export function linkBooking(texto: string, c: Pick<ConsultaHotel, "checkin" | "checkout" | "adultos" | "criancas">): string {
  const p = new URLSearchParams({
    ss: texto,
    checkin: c.checkin,
    checkout: c.checkout,
    group_adults: String(c.adultos),
    group_children: String(c.criancas ?? 0),
    no_rooms: "1",
  });
  return `https://www.booking.com/searchresults.pt-br.html?${p}`;
}
