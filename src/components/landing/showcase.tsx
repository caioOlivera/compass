"use client";

import { Check } from "lucide-react";
import { AnimatePresence, motion } from "motion/react";
import { useState } from "react";
import { projetar, ROTA, VOO_IDA, VOO_VOLTA } from "@/components/landing/data";
import { T } from "@/components/landing/type";
import { cn } from "@/lib/utils";

const SAIDAS = ["O mapa", "A parada", "O trecho", "Os voos"] as const;
type Saida = (typeof SAIDAS)[number];

/** O que a Compass entrega: um índice de saídas e, ao lado, a folha real de cada uma. */
export function Showcase() {
  const [saida, setSaida] = useState<Saida>("O mapa");

  return (
    <section id="o-que-voce-recebe" aria-label="O que você recebe" className="grid gap-8 py-16 lg:grid-cols-12 lg:gap-0 lg:py-0">
      <div className="flex flex-col justify-center gap-6 px-5 sm:px-8 lg:col-span-5 lg:py-24">
        <div
          role="tablist"
          aria-label="Saídas do roteiro"
          className="flex snap-x gap-6 overflow-x-auto lg:flex-col lg:gap-1 lg:overflow-visible"
        >
          {SAIDAS.map((s) => (
            <button
              key={s}
              type="button"
              role="tab"
              aria-selected={saida === s}
              onClick={() => setSaida(s)}
              className={cn(
                `shrink-0 snap-start text-left transition-colors ${T.titulo}`,
                saida === s ? "text-text" : "text-text-2 hover:text-text",
              )}
            >
              {s}
            </button>
          ))}
        </div>
        <p className={`max-w-[40ch] ${T.corpo}`}>
          Cada roteiro vem com o mapa da rota, o que fazer em cada parada, como ir de uma à outra e por onde
          entrar e sair de avião.
        </p>
      </div>

      <div className="relative h-[70svh] overflow-hidden bg-surface lg:col-span-7 lg:h-[88svh]">
        <AnimatePresence mode="wait" initial={false}>
          <motion.div
            key={saida}
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="absolute top-[72px] left-4 sm:left-16"
          >
            {saida === "O mapa" && <FolhaMapa />}
            {saida === "A parada" && <FolhaParada />}
            {saida === "O trecho" && <FolhaTrecho />}
            {saida === "Os voos" && <FolhaVoos />}
          </motion.div>
        </AnimatePresence>
      </div>
    </section>
  );
}

const folha = `bg-white p-7 text-text ${T.pequeno}`;

function FolhaMapa() {
  const W = 480;
  const H = 560;
  const pts = ROTA.map((p) => ({ ...p, ...projetar(p.lat, p.lng, W, H) }));
  const cores = ["#1f2b4d", "#6a7186", "#f7941d", "#0e7c86"];
  return (
    <div data-ui className={cn(folha, "w-[min(560px,88vw)]")}>
      <p className="text-[clamp(1.25rem,1.1rem+0.7vw,1.5rem)] font-medium">Itália de Roma às Dolomitas</p>
      <p className="mt-1 text-text-2">4 paradas · 15 dias · 3 trechos por terra</p>
      <svg viewBox={`-140 -30 ${W + 300} ${H + 60}`} className="mt-4 w-full bg-surface" role="img" aria-label="Mapa da rota">
        <polyline
          points={pts.map((p) => `${p.x},${p.y}`).join(" ")}
          fill="none"
          stroke="#1f2b4d"
          strokeWidth={4}
          strokeLinejoin="round"
        />
        {pts.map((p, i) => (
          <g key={p.id}>
            <circle cx={p.x} cy={p.y} r={18} fill={cores[i]} stroke="white" strokeWidth={5} />
            <text
              x={p.x + (p.id === "milao" ? -24 : 24)}
              y={p.y + 7}
              textAnchor={p.id === "milao" ? "end" : "start"}
              fontSize={32}
              fill="#1f2b4d"
            >
              {p.nome} · {p.dias}d
            </text>
          </g>
        ))}
      </svg>
    </div>
  );
}

function FolhaParada() {
  const itens = [
    ["Trilha ao redor das Tre Cime di Lavaredo", "Aventura", true],
    ["Lago di Braies logo cedo", "Imperdível", true],
    ["Teleférico para Seceda", "Cênico", false],
    ["Passo Giau e Passo Gardena de carro", "Cênico", false],
    ["Jantar com cozinha ladina em Cortina", "Gastronomia", false],
  ] as const;
  return (
    <div data-ui className={cn(folha, "w-[min(440px,88vw)]")}>
      <p className="text-text-2">Auge da viagem</p>
      <p className="text-[clamp(1.25rem,1.1rem+0.7vw,1.5rem)] font-medium tracking-[-0.02em]">Dolomitas</p>
      <p className="mt-1 text-text-2">Base em Cortina d'Ampezzo · 8 dias</p>
      <ul className="mt-5 flex flex-col gap-3">
        {itens.map(([item, cat, feito]) => (
          <li key={item} className="flex items-start gap-3">
            <span
              className={cn(
                "mt-0.5 flex size-5 shrink-0 items-center justify-center",
                feito ? "bg-accent text-accent-contrast" : "bg-surface-2",
              )}
              aria-hidden
            >
              {feito && <Check className="size-3.5" strokeWidth={3} />}
            </span>
            <span className="flex flex-col">
              <span className={cn(feito && "text-text-3 line-through")}>{item}</span>
              <span className="text-text-2">{cat}</span>
            </span>
          </li>
        ))}
      </ul>
      <p className="mt-5 text-text-2">2 de 5 marcados</p>
    </div>
  );
}

function FolhaTrecho() {
  return (
    <div data-ui className={cn(folha, "w-[min(440px,88vw)]")}>
      <p className="text-text-2">Florença → Dolomitas</p>
      <p className="text-[clamp(1.25rem,1.1rem+0.7vw,1.5rem)] font-medium tracking-[-0.02em]">Carro alugado · 3h 45min</p>
      <p className="mt-4 leading-[1.5]">
        Retire o carro em Florença e suba pela A1 e pela A22 até Bolzano. Os últimos 90 km são de estrada de
        montanha: saia cedo para chegar com luz.
      </p>
      <p className="mt-4 leading-[1.5] text-text-2">
        Devolução combinada em Milão (Malpensa). Locadoras costumam cobrar taxa para devolver em outra cidade.
      </p>
    </div>
  );
}

function FolhaVoos() {
  const voo = (v: typeof VOO_IDA, rotulo: string, data: string) => (
    <div className="bg-surface p-5">
      <p className="text-text-2">
        {rotulo} · {data}
      </p>
      <p className={`mt-1 tabular-nums ${T.titulo}`}>
        {v.de} → {v.para}
      </p>
      <p className="text-text-2">
        {v.cidadeDe} para {v.cidadePara}
      </p>
    </div>
  );
  return (
    <div data-ui className={cn(folha, "flex w-[min(440px,88vw)] flex-col gap-3")}>
      <p className="text-[clamp(1.25rem,1.1rem+0.7vw,1.5rem)] font-medium">Entrada e saída por cidades diferentes</p>
      {voo(VOO_IDA, "Ida", "10 set")}
      {voo(VOO_VOLTA, "Volta", "25 set")}
      <p className="leading-[1.5] text-text-2">
        Bilhete multidestino: você não gasta um dia voltando a Roma só para pegar o avião.
      </p>
    </div>
  );
}
