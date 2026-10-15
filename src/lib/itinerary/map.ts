import type { TipoPonto } from "@/lib/constants";
import type { ChecklistState, Deslocamento, Itinerary, PontoMapa } from "@/lib/validation/itinerary";

// Derivações puras do roteiro para a tela do mapa. Sem dependência do MapLibre,
// para poderem ser testadas e usadas também na lista lateral.

/** Trecho entre dois pontos consecutivos: vira uma polyline com tooltip. */
export type Trecho = {
  id: string; // "p1-p2"
  de: PontoMapa;
  para: PontoMapa;
  deslocamento: Deslocamento;
};

/** O que está selecionado na tela. Um ponto abre o drawer; um trecho abre o tooltip. */
export type Selecao = { tipo: "ponto"; id: string } | { tipo: "trecho"; id: string } | null;

export type MapViewState = {
  selecao: Selecao;
  checklist: ChecklistState;
};

/** [[lngMin, latMin], [lngMax, latMax]], formato do fitBounds do MapLibre/Mapbox. */
export type Limites = [[number, number], [number, number]];

export const ROTULO_TIPO_PONTO: Record<TipoPonto, string> = {
  hub_entrada: "Porta de entrada",
  base_intermediaria: "Base no caminho",
  auge_viagem: "Auge da viagem",
  hub_saida: "Porta de saída",
};

/** Variáveis de cor definidas em globals.css (pins, legenda e badges). */
export const COR_PONTO: Record<TipoPonto, string> = {
  hub_entrada: "var(--pin-hub-entrada)",
  base_intermediaria: "var(--pin-base)",
  auge_viagem: "var(--pin-auge)",
  hub_saida: "var(--pin-hub-saida)",
};

export type TipoTransporte = "voo" | "trem" | "barco" | "onibus" | "carro" | "outro";

export const ROTULO_TRANSPORTE: Record<TipoTransporte, string> = {
  voo: "Voo",
  trem: "Trem",
  barco: "Barco",
  onibus: "Ônibus",
  carro: "Carro",
  outro: "Deslocamento",
};

// A IA escreve o meio de transporte em texto livre ("Trem Frecciarossa", "Carro alugado").
// A ordem importa: "ferry com carro" é barco, "voo + transfer de carro" é voo.
const PADROES_TRANSPORTE: [TipoTransporte, RegExp][] = [
  ["voo", /\b(voo|aere[oa]|aviao|low.?cost|flight)/],
  ["barco", /\b(ferry|balsa|barco|navio|catamara|lancha|cruzeiro)/],
  ["trem", /\b(trem|ferrovi|frecciarossa|italo|tgv|ice|eurostar|shinkansen|rail|metro)/],
  ["onibus", /\b(onibus|bus|flixbus)/],
  ["carro", /\b(carro|auto|estrada|motorhome|campervan|transfer|taxi)/],
];

export function tipoTransporte(meio: string): TipoTransporte {
  const t = meio.normalize("NFD").replace(/\p{Diacritic}/gu, "").toLowerCase();
  return PADROES_TRANSPORTE.find(([, re]) => re.test(t))?.[0] ?? "outro";
}

/** Linhas dos trechos em GeoJSON para o <Source> do mapa. id e tipo vão nas properties. */
export function geojsonDosTrechos(trechos: Trecho[]): GeoJSON.FeatureCollection<GeoJSON.LineString> {
  return {
    type: "FeatureCollection",
    features: trechos.map((t) => ({
      type: "Feature",
      properties: { id: t.id, tipo: tipoTransporte(t.deslocamento.meio_transporte) },
      geometry: {
        type: "LineString",
        coordinates: [
          [t.de.coordenadas.lng, t.de.coordenadas.lat],
          [t.para.coordenadas.lng, t.para.coordenadas.lat],
        ],
      },
    })),
  };
}

export function pontoMedio(t: Trecho): { lat: number; lng: number } {
  return {
    lat: (t.de.coordenadas.lat + t.para.coordenadas.lat) / 2,
    lng: (t.de.coordenadas.lng + t.para.coordenadas.lng) / 2,
  };
}

/** "Dolomitas (base Cortina d'Ampezzo)" → "Dolomitas", para rótulos curtos no mapa. */
export function nomeCurto(nome: string): string {
  return nome.replace(/\s*\(.*\)\s*$/, "") || nome;
}

export function trechosDoRoteiro(roteiro: Itinerary): Trecho[] {
  const porId = new Map(roteiro.pontos_mapa.map((p) => [p.id_ponto, p]));
  return roteiro.pontos_mapa.flatMap((de) => {
    const d = de.proximo_deslocamento;
    const para = d ? porId.get(d.destino_id) : undefined;
    return d && para ? [{ id: `${de.id_ponto}-${para.id_ponto}`, de, para, deslocamento: d }] : [];
  });
}

export function limitesDoRoteiro(pontos: PontoMapa[]): Limites {
  const lats = pontos.map((p) => p.coordenadas.lat);
  const lngs = pontos.map((p) => p.coordenadas.lng);
  return [
    [Math.min(...lngs), Math.min(...lats)],
    [Math.max(...lngs), Math.max(...lats)],
  ];
}

export function alternarItem(estado: ChecklistState, idPonto: string, indice: number): ChecklistState {
  const atuais = estado[idPonto] ?? [];
  const proximos = atuais.includes(indice)
    ? atuais.filter((i) => i !== indice)
    : [...atuais, indice].sort((a, b) => a - b);
  const { [idPonto]: _removido, ...resto } = estado;
  return proximos.length ? { ...resto, [idPonto]: proximos } : resto;
}

export function itemMarcado(estado: ChecklistState, idPonto: string, indice: number): boolean {
  return estado[idPonto]?.includes(indice) ?? false;
}

/** Progresso geral do checklist: marcados / total de itens no roteiro. */
export function progressoChecklist(roteiro: Itinerary, estado: ChecklistState): { marcados: number; total: number } {
  let marcados = 0;
  let total = 0;
  for (const p of roteiro.pontos_mapa) {
    total += p.atribuicoes_e_checklist.length;
    marcados += (estado[p.id_ponto] ?? []).filter((i) => i < p.atribuicoes_e_checklist.length).length;
  }
  return { marcados, total };
}
