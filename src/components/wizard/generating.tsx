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

/** Tela de espera: a geração leva de 30 s a 2 min. */
export function Gerando({ auge }: { auge: string }) {
  const [i, setI] = useState(0);

  useEffect(() => {
    const t = setInterval(() => setI((x) => Math.min(x + 1, ETAPAS_IA.length - 1)), 9000);
    return () => clearInterval(t);
  }, []);

  return (
    <section className="flex flex-col items-center gap-6 py-16 text-center" aria-live="polite" aria-busy="true">
      <motion.span
        animate={{ rotate: 360 }}
        transition={{ duration: 6, repeat: Infinity, ease: "linear" }}
        className="text-accent"
      >
        <Compass className="size-12" aria-hidden />
      </motion.span>
      <div className="flex flex-col gap-2">
        <h1 className="text-2xl font-semibold tracking-tight">Desenhando sua viagem{auge ? ` até ${auge}` : ""}</h1>
        <div className="h-6">
          <AnimatePresence mode="wait">
            <motion.p
              key={i}
              initial={{ opacity: 0, y: 6 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -6 }}
              className="text-text-2"
            >
              {ETAPAS_IA[i]}…
            </motion.p>
          </AnimatePresence>
        </div>
      </div>
      <p className="max-w-sm text-sm text-text-3">Costuma levar de 30 segundos a 2 minutos. Não feche esta página.</p>
    </section>
  );
}
