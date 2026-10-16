import { dentroDaSubregiao } from "@/lib/geo/subregions";
import { PONTOS_TERRA } from "@/lib/geo/pontos-terra";
import type { SubregiaoId } from "@/lib/constants";

// Mapa-múndi de pontos (equirretangular, longitude -168..180, latitude 72..-56). A região
// escolhida acende e um arco sai de São Paulo até ela.

const X0 = -168;
const Y0 = 72;
const LARGURA = 348;
const ALTURA = 128;

const xy = (lng: number, lat: number) => [lng - X0, Y0 - lat] as const;

const CENTRO: Partial<Record<SubregiaoId, [number, number]>> = {
  europa: [11, 47],
  "america-do-norte": [-100, 42],
  "america-do-sul": [-62, -15],
  "asia-leste": [125, 35],
  "sudeste-asiatico": [104, 10],
  "oriente-medio": [48, 27],
  oceania: [140, -27],
};

export function MapaPontos({ regiao, className }: { regiao: SubregiaoId; className?: string }) {
  const [sx, sy] = xy(-46.6, -23.5);
  const destino = CENTRO[regiao];
  const [dx, dy] = destino ? xy(...destino) : [sx, sy];
  // Arco: ponto de controle acima do meio do caminho
  const cx = (sx + dx) / 2;
  const cy = Math.min(sy, dy) - Math.abs(dx - sx) * 0.25 - 8;
  return (
    <svg viewBox={`0 0 ${LARGURA} ${ALTURA}`} className={className} role="img" aria-label="Mapa-múndi com a região escolhida em destaque">
      {PONTOS_TERRA.map(([lng, lat]) => {
        const [x, y] = xy(lng, lat);
        const aceso = dentroDaSubregiao(regiao, { lat, lng });
        return <circle key={`${lng},${lat}`} cx={x} cy={y} r={aceso ? 1.15 : 0.9} fill={aceso ? "var(--accent)" : "currentColor"} opacity={aceso ? 1 : 0.22} />;
      })}
      {destino && (
        <>
          <path d={`M ${sx} ${sy} Q ${cx} ${cy} ${dx} ${dy}`} fill="none" stroke="var(--accent)" strokeWidth={0.8} strokeDasharray="2 2" />
          <circle cx={dx} cy={dy} r={2.6} fill="var(--accent)" />
        </>
      )}
      <circle cx={sx} cy={sy} r={2.2} fill="currentColor" />
      <text x={sx + 4} y={sy + 1.5} fontSize={5} fill="currentColor">
        São Paulo
      </text>
    </svg>
  );
}
