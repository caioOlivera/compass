import type { SubregiaoId } from "@/lib/constants";
import type { Coordenadas } from "@/lib/validation/itinerary";

// Caixas generosas (com sobreposição entre vizinhas) só para pegar erro grosseiro da IA:
// coordenada trocada, lat/lng invertidas ou um ponto em outro continente.
// Não servem para decidir fronteira fina entre sub-regiões.
type Caixa = { latMin: number; latMax: number; lngMin: number; lngMax: number };

const CAIXAS: Record<SubregiaoId, Caixa[]> = {
  "america-do-norte": [{ latMin: 14, latMax: 72, lngMin: -170, lngMax: -50 }],
  "america-central": [{ latMin: 5, latMax: 27, lngMin: -93, lngMax: -59 }],
  "america-do-sul": [{ latMin: -56, latMax: 13, lngMin: -92, lngMax: -34 }],
  "europa-do-norte": [{ latMin: 47, latMax: 72, lngMin: -25, lngMax: 45 }],
  "europa-do-sul": [{ latMin: 27, latMax: 48, lngMin: -19, lngMax: 35 }],
  "europa-central-leste": [{ latMin: 41, latMax: 60, lngMin: -5, lngMax: 50 }],
  "asia-leste": [{ latMin: 18, latMax: 54, lngMin: 73, lngMax: 146 }],
  // Índia, Paquistão, Nepal, Butão, Bangladesh, Sri Lanka, Maldivas
  "asia-sul": [{ latMin: -1, latMax: 37, lngMin: 60, lngMax: 98 }],
  "oriente-medio": [{ latMin: 12, latMax: 43, lngMin: 25, lngMax: 64 }],
  "sudeste-asiatico": [{ latMin: -11, latMax: 29, lngMin: 92, lngMax: 142 }],
  "africa-do-norte": [{ latMin: 15, latMax: 38, lngMin: -18, lngMax: 38 }],
  "africa-subsaariana": [{ latMin: -35, latMax: 25, lngMin: -26, lngMax: 64 }],
  // Atravessa o antimeridiano: Austrália/NZ/Fiji de um lado, Polinésia do outro
  oceania: [
    { latMin: -50, latMax: 23, lngMin: 110, lngMax: 180 },
    { latMin: -50, latMax: 23, lngMin: -180, lngMax: -130 },
  ],
};

export function dentroDaSubregiao(subregiao: SubregiaoId, { lat, lng }: Coordenadas): boolean {
  return CAIXAS[subregiao].some((c) => lat >= c.latMin && lat <= c.latMax && lng >= c.lngMin && lng <= c.lngMax);
}
