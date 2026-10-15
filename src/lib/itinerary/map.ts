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
