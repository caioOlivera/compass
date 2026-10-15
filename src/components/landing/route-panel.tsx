"use client";

import { motion } from "motion/react";
import { projetar, ROTA, VOO_IDA, VOO_VOLTA } from "@/components/landing/data";
import { cn } from "@/lib/utils";

const L = 400;
const A = 470;
const PONTOS = ROTA.map((p) => ({ ...p, ...projetar(p.lat, p.lng, L, A) }));

/**
 * O lado fixo da página: a rota do exemplo, que avança uma parada a cada seção lida.
 * `ativa` = -1 no primeiro ecrã (rota inteira, nada destacado), 0..3 = parada em leitura.
 */
export function RoutePanel({ ativa }: { ativa: number }) {
  const atual = ativa >= 0 ? ROTA[ativa] : undefined;
  const diasAteAgora = ROTA.slice(0, Math.max(ativa + 1, 0)).reduce((s, p) => s + p.dias, 0);

  return (
    <div data-ui className="flex h-full flex-col justify-between gap-6 bg-field-dark p-7 text-field-dark-ink sm:p-10">
      <div className="flex items-baseline justify-between gap-4 text-[15px]">
        <span>
          {VOO_IDA.de} → {VOO_IDA.para}
        </span>
        <span className="hidden text-white/60 sm:inline">15 dias · ritmo médio</span>
        <span>
          {VOO_VOLTA.de} → {VOO_VOLTA.para}
        </span>
      </div>

      <svg viewBox={`-40 -30 ${L + 80} ${A + 60}`} className="mx-auto h-full max-h-[52svh] w-full" role="img" aria-label="Rota Roma, Florença, Dolomitas, Milão">
        {PONTOS.slice(0, -1).map((p, i) => {
          const q = PONTOS[i + 1];
          const percorrido = ativa > i;
          return (
            <g key={p.id}>
              <line x1={p.x} y1={p.y} x2={q.x} y2={q.y} stroke="white" strokeOpacity={0.18} strokeWidth={3} />
              <motion.line
                x1={p.x}
                y1={p.y}
                x2={q.x}
                y2={q.y}
                stroke="#f7941d"
                strokeWidth={4}
                strokeLinecap="round"
                initial={false}
                animate={{ pathLength: percorrido ? 1 : 0 }}
                transition={{ duration: 0.7, ease: [0.22, 1, 0.36, 1] }}
              />
            </g>
          );
        })}
        {PONTOS.map((p, i) => {
          const ligada = ativa >= i;
          const foco = ativa === i;
          const direita = p.id !== "milao";
          return (
            <g key={p.id}>
              <motion.circle
                cx={p.x}
                cy={p.y}
                initial={false}
                animate={{ r: foco ? 13 : 8 }}
                fill={ligada ? "#f7941d" : "#05070a"}
                stroke={ligada ? "#f7941d" : "white"}
                strokeWidth={3}
              />
              <text
                x={p.x + (direita ? 22 : -22)}
                y={p.y + 6}
                textAnchor={direita ? "start" : "end"}
                fill="white"
                fillOpacity={ligada || ativa < 0 ? 1 : 0.55}
                fontSize={foco ? 30 : 24}
                style={{ transition: "font-size 300ms, fill-opacity 300ms" }}
              >
                {p.nome}
              </text>
            </g>
          );
        })}
      </svg>

      <div className="flex flex-col gap-3">
        <div className="grid grid-cols-4 gap-1" aria-hidden>
          {ROTA.map((p, i) => (
            <span
              key={p.id}
              className={cn("h-2 transition-colors duration-500", ativa >= i ? "bg-accent" : "bg-white/15")}
            />
          ))}
        </div>
        <p className="flex items-baseline justify-between gap-4 text-[clamp(1.0625rem,1rem+0.25vw,1.1875rem)]" aria-live="polite">
          <span>{atual ? `${atual.nome}, ${atual.papel.toLowerCase()}` : "Uma linha só, de uma porta à outra"}</span>
          <span className="tabular-nums text-white/70">{atual ? `até o dia ${diasAteAgora} de 15` : "4 paradas"}</span>
        </p>
      </div>
    </div>
  );
}
