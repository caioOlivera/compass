"use client";

import { AnimatePresence, motion } from "motion/react";
import { useState } from "react";
import { T } from "@/components/landing/type";
import { cn } from "@/lib/utils";

const ETAPAS = [
  { nome: "Região", frase: "Primeiro, a região" },
  { nome: "Datas", frase: "Depois, as datas" },
  { nome: "Auge", frase: "Então, o auge" },
  { nome: "Rota", frase: "E a rota sai pronta" },
] as const;

/** Como funciona: um slider que passa pelas etapas do questionário, com a tela real em cada estado. */
export function Stages() {
  const [etapa, setEtapa] = useState(0);
  const pct = (etapa / (ETAPAS.length - 1)) * 100;

  return (
    <section id="como-funciona" aria-labelledby="etapa-atual" className="flex flex-col bg-surface lg:min-h-[88svh]">
      <div className="grid flex-1 lg:grid-cols-2">
        <div className="order-2 flex flex-col justify-between gap-8 px-5 py-10 sm:px-8 lg:order-1 lg:py-16">
          <AnimatePresence mode="wait" initial={false}>
            <motion.h2
              key={etapa}
              id="etapa-atual"
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -12 }}
              transition={{ duration: 0.2 }}
              className={`max-w-[16ch] ${T.titulo}`}
            >
              {ETAPAS[etapa].frase}
            </motion.h2>
          </AnimatePresence>
          <p className={`max-w-[42ch] ${T.corpo}`}>
            São sete perguntas curtas. Nenhuma pede que você já saiba o caminho: isso é o trabalho da Compass.
          </p>
        </div>
        <div className="order-1 flex items-center justify-center bg-field-warm px-5 py-10 lg:order-2">
          <AnimatePresence mode="wait" initial={false}>
            <motion.div
              key={etapa}
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.2 }}
              className="w-full max-w-[440px]"
            >
              <Fragmento etapa={etapa} />
            </motion.div>
          </AnimatePresence>
        </div>
      </div>

      <div className="px-5 pt-6 pb-8 sm:px-8">
        <div className="relative">
          {/* Trilho e parte percorrida em cor chapada; o input fica por cima, transparente */}
          <span className="pointer-events-none absolute top-1/2 right-0 left-0 h-2 -translate-y-1/2 bg-surface-2" aria-hidden />
          <span
            className="pointer-events-none absolute top-1/2 left-0 h-2 -translate-y-1/2 bg-text transition-[width] duration-200"
            style={{ width: `${pct}%` }}
            aria-hidden
          />
        <input
          type="range"
          min={0}
          max={ETAPAS.length - 1}
          step={1}
          value={etapa}
          onChange={(e) => setEtapa(Number(e.target.value))}
          aria-label="Etapa do questionário"
          aria-valuetext={ETAPAS[etapa].nome}
          className="stage-range relative w-full"
        />
        </div>
        <div className={`mt-3 grid grid-cols-2 gap-y-1 sm:grid-cols-4 ${T.pequeno}`}>
          {ETAPAS.map((e, i) => (
            <button
              key={e.nome}
              type="button"
              onClick={() => setEtapa(i)}
              className={cn(
                "text-left transition-colors sm:text-center sm:first:text-left sm:last:text-right",
                i === etapa ? "font-medium text-text" : "text-text-2 hover:text-text",
              )}
            >
              {e.nome}
            </button>
          ))}
        </div>
      </div>
    </section>
  );
}

function Fragmento({ etapa }: { etapa: number }) {
  const caixa = `bg-white p-6 text-text ${T.pequeno}`;
  if (etapa === 0) {
    return (
      <div data-ui className={caixa}>
        <p className="mb-4 text-[clamp(1.25rem,1.1rem+0.7vw,1.5rem)] font-medium">Para onde você vai?</p>
        <div className="grid grid-cols-2 gap-2">
          {["América do Norte", "América do Sul", "Europa", "Ásia Leste", "Oriente Médio", "Oceania"].map((r) => (
            <span
              key={r}
              className={cn("px-3 py-3", r === "Europa" ? "bg-text font-medium text-white" : "bg-surface")}
            >
              {r}
            </span>
          ))}
        </div>
      </div>
    );
  }
  if (etapa === 1) {
    return (
      <div data-ui className={caixa}>
        <p className="mb-4 text-[clamp(1.25rem,1.1rem+0.7vw,1.5rem)] font-medium">Quando?</p>
        <div className="grid grid-cols-2 gap-3">
          <Campo rotulo="Saída" valor="10/09/2026" />
          <Campo rotulo="Retorno" valor="25/09/2026" />
        </div>
        <p className="mt-4">
          <strong className="font-medium">15 dias</strong> de viagem
        </p>
        <p className="mt-1 text-text-2">Flexibilidade na ida: ± 2 dias</p>
      </div>
    );
  }
  if (etapa === 2) {
    return (
      <div data-ui className={caixa}>
        <p className="mb-4 text-[clamp(1.25rem,1.1rem+0.7vw,1.5rem)] font-medium">Qual é o auge da viagem?</p>
        <Campo rotulo="Auge da viagem" valor="Dolomitas" />
        <p className="mt-4 mb-2 text-text-2">Quero passar por</p>
        <div className="flex gap-2">
          {["Roma", "Milão"].map((l) => (
            <span key={l} className="bg-surface px-3 py-1.5">
              {l}
            </span>
          ))}
        </div>
        <p className="mt-4 mb-2 text-text-2">Não quero conhecer</p>
        <span className="bg-surface px-3 py-1.5 line-through">Veneza</span>
      </div>
    );
  }
  return (
    <div data-ui className={caixa}>
      <p className="text-[clamp(1.25rem,1.1rem+0.7vw,1.5rem)] font-medium">Itália de Roma às Dolomitas</p>
      <p className="mt-1 text-text-2">Entrada por Roma (FCO), saída por Milão (MXP)</p>
      <ul className="mt-5 flex flex-col gap-2.5">
        {[
          ["Roma", "3 dias", "bg-text"],
          ["Florença", "2 dias", "bg-text-3"],
          ["Dolomitas", "8 dias", "bg-accent"],
          ["Milão", "2 dias", "bg-[#0e7c86]"],
        ].map(([n, d, cor]) => (
          <li key={n} className="flex items-center gap-3">
            <span className={cn("size-3.5 rounded-full", cor)} aria-hidden />
            <span className="flex-1">{n}</span>
            <span className="tabular-nums text-text-2">{d}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}

function Campo({ rotulo, valor }: { rotulo: string; valor: string }) {
  return (
    <div className="flex flex-col gap-1.5">
      <span className="text-text-2">{rotulo}</span>
      <span className="bg-surface px-3 py-2.5 tabular-nums">{valor}</span>
    </div>
  );
}
