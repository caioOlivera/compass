import { BusFront, CarFront, Plane, Route, Ship, TrainFront, type LucideIcon } from "lucide-react";
import { ROTULO_TRANSPORTE, tipoTransporte, type TipoTransporte } from "@/lib/itinerary/map";
import type { Deslocamento } from "@/lib/validation/itinerary";
import { cn } from "@/lib/utils";

export const ICONE_TRANSPORTE: Record<TipoTransporte, LucideIcon> = {
  voo: Plane,
  trem: TrainFront,
  barco: Ship,
  onibus: BusFront,
  carro: CarFront,
  outro: Route,
};

/** Mesmas cores das linhas no mapa (MapLibre não lê variáveis CSS). */
export const COR_TRANSPORTE: Record<TipoTransporte, string> = {
  voo: "#6250d6",
  trem: "#2a78d6",
  barco: "#0e9aa7",
  onibus: "#b0751c",
  carro: "#1f6f5c",
  outro: "#6b6b63",
};

export function LegResumo({ deslocamento, className }: { deslocamento: Deslocamento; className?: string }) {
  const tipo = tipoTransporte(deslocamento.meio_transporte);
  const Icone = ICONE_TRANSPORTE[tipo];
  return (
    <span className={cn("inline-flex min-w-0 items-center gap-1.5 text-sm text-text-2", className)}>
      <Icone className="size-4 shrink-0" style={{ color: COR_TRANSPORTE[tipo] }} aria-label={ROTULO_TRANSPORTE[tipo]} />
      <span className="truncate">{deslocamento.meio_transporte}</span>
      <span aria-hidden className="text-text-3">·</span>
      <span className="shrink-0 tabular-nums">{deslocamento.tempo_estimado}</span>
    </span>
  );
}

export function LegDetalhe({ deslocamento, de, para }: { deslocamento: Deslocamento; de: string; para: string }) {
  return (
    <div className="flex flex-col gap-1.5">
      <p className="text-xs font-medium tracking-wide text-text-3 uppercase">
        {de} → {para}
      </p>
      <LegResumo deslocamento={deslocamento} className="text-text" />
      <p className="text-sm text-text-2">{deslocamento.instrucoes_logistica}</p>
    </div>
  );
}
