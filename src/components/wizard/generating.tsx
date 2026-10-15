"use client";

import { Compass } from "lucide-react";
import { AnimatePresence, motion } from "motion/react";
import { useEffect, useState } from "react";

const ETAPAS_IA = [
  "Lendo suas respostas",
  "Escolhendo a porta de entrada e a de saída",
  "Transformando o auge em bases estratégicas",
  "Encaixando as paradas no caminho, sem bate-e-volta",
  "Distribuindo os dias pelo seu ritmo",
  "Montando o checklist de cada parada",
  "Conferindo a rota",
];

// A IA não informa o próprio progresso, então a barra é uma estimativa honesta: corre no começo,
// desacelera e nunca chega a 100% antes de o roteiro existir. Com TEMPO_TIPICO_S de duração ela
// está em ~75%; se a geração demorar mais (modelo sobrecarregado, nova tentativa), segue andando
// devagar até 95%.
const TEMPO_TIPICO_S = 45;
const TETO = 0.95;

export function progressoEstimado(segundos: number): number {
  return TETO * (1 - Math.exp(-segundos / (TEMPO_TIPICO_S / 1.6)));
}

/** Tela de espera enquanto a IA gera o roteiro. */
export function Gerando({ auge }: { auge: string }) {
  const [segundos, setSegundos] = useState(0);

  useEffect(() => {
    const inicio = Date.now();
    const t = setInterval(() => setSegundos((Date.now() - inicio) / 1000), 250);
    return () => clearInterval(t);
  }, []);

  const progresso = progressoEstimado(segundos);
  const etapa = Math.min(Math.floor((progresso / TETO) * ETAPAS_IA.length), ETAPAS_IA.length - 1);
  const pct = Math.round(progresso * 100);
  const demorando = segundos > TEMPO_TIPICO_S * 1.5;

  return (
    <section className="mx-auto flex max-w-md flex-col items-center gap-8 py-16 text-center" aria-busy="true">
      <motion.span
        animate={{ rotate: 360 }}
        transition={{ duration: 6, repeat: Infinity, ease: "linear" }}
        className="text-text"
      >
        <Compass className="size-12" aria-hidden />
      </motion.span>

      <div className="flex flex-col gap-2">
        <h1 className="text-2xl font-semibold tracking-tight text-balance">
          Desenhando sua viagem{auge ? ` até ${auge}` : ""}
        </h1>
        <div className="h-6" aria-live="polite">
          <AnimatePresence mode="wait">
            <motion.p
              key={etapa}
              initial={{ opacity: 0, y: 6 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -6 }}
              className="text-text-2"
            >
              {ETAPAS_IA[etapa]}…
            </motion.p>
          </AnimatePresence>
        </div>
      </div>

      <div className="flex w-full flex-col gap-2">
        <div
          role="progressbar"
          aria-label="Progresso estimado da geração do roteiro"
          aria-valuemin={0}
          aria-valuemax={100}
          aria-valuenow={pct}
          className="h-3 w-full overflow-hidden bg-surface-2"
        >
          <div className="h-full bg-accent transition-[width] duration-300 ease-out" style={{ width: `${pct}%` }} />
        </div>
        <div className="flex justify-between text-sm text-text-2 tabular-nums">
          <span>{pct}%</span>
          <span>{formatarTempo(segundos)}</span>
        </div>
      </div>

      <p className="text-sm text-text-2">
        {demorando
          ? "Está levando um pouco mais que o normal: o serviço de IA está ocupado e tentamos de novo sozinhos. Não feche esta página."
          : "Costuma levar menos de 1 minuto. Não feche esta página."}
      </p>
    </section>
  );
}

function formatarTempo(segundos: number): string {
  const s = Math.floor(segundos);
  return s < 60 ? `${s}s` : `${Math.floor(s / 60)}min ${String(s % 60).padStart(2, "0")}s`;
}
