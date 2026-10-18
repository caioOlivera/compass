"use client";

import { motion } from "motion/react";
import { projetar, ROTA, VOO_IDA, VOO_VOLTA } from "@/components/landing/data";
import type { Foto } from "@/lib/images/fotos";
import { cn } from "@/lib/utils";

const L = 400;
const A = 470;
const RESERVA = [
  { emoji: "🏛️", cor: "#5b4a3a" },
  { emoji: "🎨", cor: "#4a5a3a" },
  { emoji: "🏔️", cor: "#2f4f6a" },
  { emoji: "⛪", cor: "#4a3f5a" },
];
const PONTOS = ROTA.map((p) => ({ ...p, ...projetar(p.lat, p.lng, L, A) }));

/**
 * O lado fixo da página: a foto da parada em leitura ocupa o painel e a rota fica desenhada num
 * cartão por cima, avançando uma parada a cada seção lida.
 * `ativa` = -1 no primeiro ecrã (foto do auge, rota inteira), 0..3 = parada em leitura.
 * Sem foto (sem chave de banco de imagens), fica o fundo escuro.
 */
export function RoutePanel({ ativa, fotos = [] }: { ativa: number; fotos?: (Foto | null)[] }) {
  const fotoVisivel = ativa >= 0 ? ativa : 2;
  const atual = ativa >= 0 ? ROTA[ativa] : undefined;
  const diasAteAgora = ROTA.slice(0, Math.max(ativa + 1, 0)).reduce((s, p) => s + p.dias, 0);

  return (
    <div data-ui className="relative flex h-full flex-col justify-between gap-3 overflow-hidden rounded-3xl bg-field-dark p-4 text-field-dark-ink sm:gap-6 sm:p-8">
      {/* Reserva sem banco de fotos: cor e emoji da parada */}
      {!fotos[fotoVisivel] && (
        <div
          className="absolute inset-0 flex items-center justify-center transition-colors duration-700"
          style={{ background: RESERVA[fotoVisivel].cor }}
          aria-hidden
        >
          <span className="text-[min(9rem,30vw)] opacity-90">{RESERVA[fotoVisivel].emoji}</span>
        </div>
      )}
      {ROTA.map((p, i) => {
        const f = fotos[i];
        if (!f) return null;
        return (
          // eslint-disable-next-line @next/next/no-img-element -- foto externa (Unsplash/Pexels), já no tamanho certo
          <img
            key={p.id}
            src={f.grande}
            alt={i === fotoVisivel ? f.alt : ""}
            aria-hidden={i !== fotoVisivel}
            loading="lazy"
            decoding="async"
            className={cn(
              "absolute inset-0 h-full w-full object-cover transition-[opacity,transform] duration-700 ease-out",
              i === fotoVisivel ? "scale-100 opacity-100" : "scale-105 opacity-0",
            )}
          />
        );
      })}
      {/* Escurece em cima e embaixo para o texto ler sobre qualquer foto */}
      <div className="pointer-events-none absolute inset-0 bg-gradient-to-b from-black/60 via-black/10 to-black/75" aria-hidden />

      <div className="relative flex items-baseline justify-between gap-4 text-xs font-medium sm:text-[15px]">
        <span className="rounded-full bg-black/40 px-3 py-1 backdrop-blur-sm">
          ✈️ {VOO_IDA.de} → {VOO_IDA.para}
        </span>
        <span className="hidden text-white/80 sm:inline">15 dias · ritmo médio</span>
        <span className="rounded-full bg-black/40 px-3 py-1 backdrop-blur-sm">
          {VOO_VOLTA.de} → {VOO_VOLTA.para} ✈️
        </span>
      </div>

      <div className="relative flex flex-1 items-end">
        <div className="w-[min(240px,60%)] rounded-2xl bg-black/45 p-2 backdrop-blur-md max-lg:w-[130px] sm:p-3">
      <svg viewBox={`-40 -30 ${L + 80} ${A + 60}`} className="h-auto w-full" role="img" aria-label="Rota Roma, Florença, Dolomitas, Milão">
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
                stroke="#4fb89b"
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
                fill={ligada ? "#4fb89b" : "#13140f"}
                stroke={ligada ? "#4fb89b" : "white"}
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
        </div>
      </div>

      <div className="relative flex flex-col gap-3">
        <div className="grid grid-cols-4 gap-1" aria-hidden>
          {ROTA.map((p, i) => (
            <span
              key={p.id}
              className={cn("h-2 transition-colors duration-500", ativa >= i ? "bg-accent" : "bg-white/25")}
            />
          ))}
        </div>
        <p className="flex items-baseline justify-between gap-4 text-sm sm:text-[clamp(1.0625rem,1rem+0.25vw,1.1875rem)]" aria-live="polite">
          <span>{atual ? `${atual.nome}, ${atual.papel.toLowerCase()}` : "Uma linha só, de uma porta à outra"}</span>
          <span className="tabular-nums text-white/70">{atual ? `até o dia ${diasAteAgora} de 15` : "4 paradas"}</span>
        </p>
      </div>
    </div>
  );
}
