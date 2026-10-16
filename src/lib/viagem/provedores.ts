import "server-only";
import { serverEnv } from "@/lib/env";
import { lerLinksParceiro, lerPrecos, linkBuscaAviasales, parametrosPrecos } from "./aviasales";
import { lerHoteis, lerVoos, linkBooking, parametrosHotel, parametrosVoo } from "./serpapi-ler";
import { ProvedorViagemError, type ConsultaHotel, type ConsultaVoo, type OfertaHotel, type OfertaVoo, type ProvedorHoteis, type ProvedorVoos } from "./tipos";

// Chamadas de rede dos provedores de passagens e hotéis. Só no servidor: as chaves ficam nas
// variáveis de ambiente e a Travelpayouts nem aceita chamada do navegador (sem CORS).

const TP = "https://api.travelpayouts.com";

async function obterJson(provedor: string, url: string, init: RequestInit = {}, signal?: AbortSignal): Promise<unknown> {
  const res = await fetch(url, {
    ...init,
    signal: signal ? AbortSignal.any([signal, AbortSignal.timeout(20_000)]) : AbortSignal.timeout(20_000),
    cache: "no-store",
    headers: { "Accept-Encoding": "gzip", ...init.headers },
  });
  if (!res.ok) throw new ProvedorViagemError(provedor, res.status, `${provedor} ${res.status}: ${(await res.text().catch(() => "")).slice(0, 200)}`);
  return res.json();
}

export const travelpayoutsConfigurado = () => !!serverEnv().TRAVELPAYOUTS_TOKEN;
export const serpapiConfigurada = () => !!serverEnv().SERPAPI_KEY;

/** Aviasales Data API: preços encontrados nas buscas recentes (cache de até 48 h do lado deles). Grátis. */
export const travelpayoutsVoos: ProvedorVoos = {
  nome: "travelpayouts",
  async buscar(c: ConsultaVoo, signal?: AbortSignal): Promise<OfertaVoo[]> {
    const token = serverEnv().TRAVELPAYOUTS_TOKEN;
    if (!token) throw new ProvedorViagemError("travelpayouts", 503, "TRAVELPAYOUTS_TOKEN não configurado.");
    const json = await obterJson("travelpayouts", `${TP}/aviasales/v3/prices_for_dates?${parametrosPrecos(c)}`, { headers: { "X-Access-Token": token } }, signal);
    return lerPrecos(json, c);
  },
};

/** Google Flights pela SerpApi: preço ao vivo, pago por busca, sem afiliado. Só para conferência. */
export const serpapiVoos: ProvedorVoos = {
  nome: "serpapi",
  async buscar(c: ConsultaVoo, signal?: AbortSignal): Promise<OfertaVoo[]> {
    const chave = serverEnv().SERPAPI_KEY;
    if (!chave) throw new ProvedorViagemError("serpapi", 503, "SERPAPI_KEY não configurada.");
    const p = new URLSearchParams({ ...parametrosVoo(c), api_key: chave });
    const json = await obterJson("serpapi", `https://serpapi.com/search.json?${p}`, {}, signal);
    return lerVoos(json, c.adultos + (c.criancas ?? 0));
  },
};

/** Google Hotels pela SerpApi: diária de referência; o link vai para o Booking (afiliado quando houver). */
export const serpapiHoteis: ProvedorHoteis = {
  nome: "serpapi",
  async buscar(c: ConsultaHotel, signal?: AbortSignal): Promise<OfertaHotel[]> {
    const chave = serverEnv().SERPAPI_KEY;
    if (!chave) throw new ProvedorViagemError("serpapi", 503, "SERPAPI_KEY não configurada.");
    const p = new URLSearchParams({ ...parametrosHotel(c), api_key: chave });
    const json = await obterJson("serpapi", `https://serpapi.com/search.json?${p}`, {}, signal);
    return lerHoteis(json, c, (texto) => linkBooking(texto, c));
  },
};

/** Sem SerpApi: nenhum preço, só o link de busca do Booking para a cidade (melhor que nada). */
export function hoteisSemPreco(c: ConsultaHotel): OfertaHotel[] {
  return [
    {
      provedor: "booking",
      nome: `Hotéis em ${c.cidade}`,
      diaria_brl: null,
      total_brl: null,
      nota: null,
      avaliacoes: null,
      estrelas: null,
      lat: null,
      lng: null,
      foto: null,
      fonte_preco: null,
      link: linkBooking(c.cidade, c),
    },
  ];
}

export function voosSemPreco(c: ConsultaVoo): OfertaVoo[] {
  return [
    {
      provedor: "aviasales",
      preco_brl: 0,
      companhia: null,
      voo: null,
      partida: null,
      chegada_volta: null,
      escalas: null,
      duracao_min: null,
      link: linkBuscaAviasales(c),
    },
  ];
}

/**
 * Troca links de lojas (Aviasales, Booking) por links de afiliado pela API da Travelpayouts,
 * 10 por chamada. Sem marker configurado, ou se a API falhar, devolve os links originais.
 */
export async function linksDeAfiliado(urls: string[], subId: string): Promise<string[]> {
  const { TRAVELPAYOUTS_TOKEN: token, TRAVELPAYOUTS_MARKER: marker, TRAVELPAYOUTS_TRS: trs } = serverEnv();
  if (!token || !marker || !trs || !urls.length) return urls;
  const saida = [...urls];
  for (let i = 0; i < urls.length; i += 10) {
    const lote = urls.slice(i, i + 10);
    try {
      const json = await obterJson("travelpayouts", `${TP}/links/v1/create`, {
        method: "POST",
        headers: { "X-Access-Token": token, "Content-Type": "application/json" },
        body: JSON.stringify({ trs: Number(trs), marker: Number(marker), shorten: true, links: lote.map((url) => ({ url, sub_id: subId.slice(0, 60) })) }),
      });
      lerLinksParceiro(json, lote.length).forEach((l, k) => l && (saida[i + k] = l));
    } catch (e) {
      console.error("[afiliado] links", e);
    }
  }
  return saida;
}
