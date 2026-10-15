import type { Foto } from "@/lib/images/fotos";
import { nomeCurto } from "@/lib/itinerary/map";
import type { Itinerary } from "@/lib/validation/itinerary";

export type FotosPorPonto = Record<string, Foto | null>;

/** Busca usada para a foto de uma parada: o nome curto ("Dolomitas (base Cortina)" → "Dolomitas"). */
export function consultaDaParada(nomeLocal: string): string {
  return nomeCurto(nomeLocal);
}

/** Uma foto por parada, buscadas em paralelo no servidor. `buscar` é injetado para não puxar server-only aqui. */
export async function fotosDoRoteiro(
  roteiro: Itinerary,
  buscar: (consulta: string) => Promise<Foto | null>,
): Promise<FotosPorPonto> {
  const fotos = await Promise.all(roteiro.pontos_mapa.map((p) => buscar(consultaDaParada(p.nome_local))));
  return Object.fromEntries(roteiro.pontos_mapa.map((p, i) => [p.id_ponto, fotos[i]]));
}

/** A parada que vira capa do roteiro: o auge; sem auge, a primeira. */
export function pontoDeCapa(roteiro: Itinerary): Itinerary["pontos_mapa"][number] {
  return roteiro.pontos_mapa.find((p) => p.tipo_ponto === "auge_viagem") ?? roteiro.pontos_mapa[0];
}
