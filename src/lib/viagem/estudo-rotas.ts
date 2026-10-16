import type { ConsultaVoo } from "./tipos";

// As 20 rotas do estudo da Fase 2 (saindo do Brasil, dez/2026 a fev/2027, ida e volta, 1 adulto)
// e as variantes testadas em cada uma. Puro: quem roda está em actions/estudo.ts.

export type Rota = { n: number; origem: string; destino: string; ida: string; volta: string; tipo: string };

export const ROTAS_ESTUDO: Rota[] = [
  { n: 1, origem: "GYN", destino: "GRU", ida: "2026-12-15", volta: "2026-12-20", tipo: "Nacional" },
  { n: 2, origem: "GYN", destino: "SSA", ida: "2027-01-12", volta: "2027-01-19", tipo: "Nacional" },
  { n: 3, origem: "GYN", destino: "FLN", ida: "2027-02-03", volta: "2027-02-10", tipo: "Nacional" },
  { n: 4, origem: "BSB", destino: "GIG", ida: "2026-12-16", volta: "2026-12-21", tipo: "Nacional" },
  { n: 5, origem: "BSB", destino: "FOR", ida: "2027-01-20", volta: "2027-01-27", tipo: "Nacional" },
  { n: 6, origem: "BSB", destino: "MAO", ida: "2027-02-08", volta: "2027-02-14", tipo: "Nacional" },
  { n: 7, origem: "GRU", destino: "REC", ida: "2027-01-14", volta: "2027-01-21", tipo: "Nacional" },
  { n: 8, origem: "GRU", destino: "POA", ida: "2027-02-04", volta: "2027-02-08", tipo: "Nacional" },
  { n: 9, origem: "GRU", destino: "EZE", ida: "2027-01-08", volta: "2027-01-14", tipo: "América do Sul" },
  { n: 10, origem: "GRU", destino: "LIS", ida: "2027-01-15", volta: "2027-01-30", tipo: "Europa" },
  { n: 11, origem: "GRU", destino: "MAD", ida: "2027-01-22", volta: "2027-02-05", tipo: "Europa" },
  { n: 12, origem: "GRU", destino: "CDG", ida: "2027-02-01", volta: "2027-02-15", tipo: "Europa" },
  { n: 13, origem: "GRU", destino: "FCO", ida: "2027-01-26", volta: "2027-02-09", tipo: "Europa" },
  { n: 14, origem: "GRU", destino: "LHR", ida: "2027-02-10", volta: "2027-02-20", tipo: "Europa" },
  { n: 15, origem: "BSB", destino: "LIS", ida: "2027-01-18", volta: "2027-02-01", tipo: "Europa" },
  { n: 16, origem: "GYN", destino: "LIS", ida: "2027-02-02", volta: "2027-02-16", tipo: "Europa" },
  { n: 17, origem: "GRU", destino: "NRT", ida: "2027-01-28", volta: "2027-02-12", tipo: "Ásia" },
  { n: 18, origem: "GRU", destino: "BKK", ida: "2027-01-10", volta: "2027-01-28", tipo: "Ásia" },
  { n: 19, origem: "GRU", destino: "DXB", ida: "2027-02-05", volta: "2027-02-15", tipo: "Oriente Médio" },
  { n: 20, origem: "BSB", destino: "SIN", ida: "2027-02-09", volta: "2027-02-24", tipo: "Ásia" },
];

/** Aeroporto → código da cidade (cobre todos os aeroportos dela). */
const CIDADE: Record<string, string> = { GRU: "SAO", GIG: "RIO", CDG: "PAR", FCO: "ROM", LHR: "LON", NRT: "TYO", EZE: "BUE" };

export type Variante = { nome: string; consulta: ConsultaVoo };

export function variantesTravelpayouts(r: Rota): Variante[] {
  const base = { origem: r.origem, destino: r.destino, adultos: 1 };
  const v: Variante[] = [
    { nome: "data exata", consulta: { ...base, ida: r.ida, volta: r.volta } },
    { nome: "mês", consulta: { ...base, ida: r.ida.slice(0, 7), volta: r.volta.slice(0, 7) } },
  ];
  const o = CIDADE[r.origem] ?? r.origem;
  const d = CIDADE[r.destino] ?? r.destino;
  if (o !== r.origem || d !== r.destino) v.push({ nome: "código de cidade", consulta: { ...base, origem: o, destino: d, ida: r.ida, volta: r.volta } });
  return v;
}

export const consultaSerpApi = (r: Rota): ConsultaVoo => ({ origem: r.origem, destino: r.destino, ida: r.ida, volta: r.volta, adultos: 1 });

/** Cidades do mini-estudo de hotéis (Fase 3): uma por perfil de destino. */
export const CIDADES_ESTUDO_HOTEL = [
  { cidade: "Lisboa", checkin: "2027-01-16", checkout: "2027-01-19" },
  { cidade: "Ortisei", checkin: "2027-01-20", checkout: "2027-01-23" },
  { cidade: "Krabi", checkin: "2026-11-20", checkout: "2026-11-23" },
  { cidade: "Gramado", checkin: "2027-02-04", checkout: "2027-02-07" },
  { cidade: "San Francisco", checkin: "2027-02-10", checkout: "2027-02-13" },
];

export type LinhaEstudo = {
  provedor: string;
  rota: number;
  variante: string;
  encontrou: boolean;
  preco_brl: number | null;
  latencia_ms: number | null;
  erro: string | null;
};

export type ResumoProvedor = { provedor: string; variante: string; consultas: number; acertos: number; latenciaMediana: number | null; erros: number };

const mediana = (xs: number[]) => {
  if (!xs.length) return null;
  const o = [...xs].sort((a, b) => a - b);
  const m = Math.floor(o.length / 2);
  return o.length % 2 ? o[m] : Math.round((o[m - 1] + o[m]) / 2);
};

/** Taxa de acerto e latência por provedor e variante. */
export function resumirEstudo(linhas: LinhaEstudo[]): ResumoProvedor[] {
  const grupos = new Map<string, LinhaEstudo[]>();
  for (const l of linhas) {
    const k = `${l.provedor}|${l.variante}`;
    grupos.set(k, [...(grupos.get(k) ?? []), l]);
  }
  return [...grupos.entries()].map(([k, ls]) => {
    const [provedor, variante] = k.split("|");
    return {
      provedor,
      variante,
      consultas: ls.length,
      acertos: ls.filter((l) => l.encontrou).length,
      erros: ls.filter((l) => l.erro).length,
      latenciaMediana: mediana(ls.map((l) => l.latencia_ms).filter((x): x is number => x != null)),
    };
  });
}

/** Desvio de preço da Travelpayouts (data exata) contra o Google (SerpApi) na mesma rota: (TP − G) / G. */
export function desviosDePreco(linhas: LinhaEstudo[]): { rota: number; desvio: number }[] {
  const tp = new Map(linhas.filter((l) => l.provedor === "travelpayouts" && l.variante === "data exata" && l.preco_brl).map((l) => [l.rota, l.preco_brl!]));
  return linhas
    .filter((l) => l.provedor === "serpapi" && l.preco_brl && tp.has(l.rota))
    .map((l) => ({ rota: l.rota, desvio: (tp.get(l.rota)! - l.preco_brl!) / l.preco_brl! }));
}

export function medianaDesvio(d: { desvio: number }[]): number | null {
  if (!d.length) return null;
  const o = d.map((x) => x.desvio).sort((a, b) => a - b);
  const m = Math.floor(o.length / 2);
  return o.length % 2 ? o[m] : (o[m - 1] + o[m]) / 2;
}
