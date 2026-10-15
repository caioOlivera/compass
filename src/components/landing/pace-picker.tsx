"use client";

import { AnimatePresence, motion } from "motion/react";
import { useState } from "react";
import { RITMOS_EXEMPLO, type RitmoExemplo } from "@/components/landing/data";
import { cn } from "@/lib/utils";

/**
 * A coisa viva da página: o mesmo pedido (15 dias, auge nas Dolomitas) redistribuído pelo ritmo.
 * Sem JavaScript, mostra o ritmo médio, que é o roteiro de exemplo.
 */
export function PacePicker() {
  const [ritmo, setRitmo] = useState<RitmoExemplo>("medio");
  const atual = RITMOS_EXEMPLO[ritmo];

  return (
    <div data-ui className="flex flex-col gap-5 bg-surface p-5 sm:p-7">
      <div role="radiogroup" aria-label="Ritmo da viagem" className="grid grid-cols-3 gap-1 bg-surface-2 p-1">
        {(Object.keys(RITMOS_EXEMPLO) as RitmoExemplo[]).map((r) => (
          <button
            key={r}
            type="button"
            role="radio"
            aria-checked={ritmo === r}
            onClick={() => setRitmo(r)}
            className={cn(
              "min-h-11 px-3 text-[15px] font-medium transition-colors active:scale-[0.98]",
              ritmo === r ? "bg-text text-bg" : "text-text-2 hover:bg-bg hover:text-text",
            )}
          >
            {RITMOS_EXEMPLO[r].rotulo}
          </button>
        ))}
      </div>

      {/* Barra dos 15 dias: cada parada ocupa a largura dos seus dias */}
      <div className="flex h-14 w-full gap-1" aria-hidden>
        <AnimatePresence initial={false} mode="popLayout">
          {atual.paradas.map((p) => (
            <motion.span
              key={`${ritmo}-${p.nome}`}
              layout
              initial={{ opacity: 0, scaleY: 0.6 }}
              animate={{ opacity: 1, scaleY: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.25 }}
              style={{ flexGrow: p.dias, flexBasis: 0 }}
              className={cn(
                "flex items-center justify-center overflow-hidden text-[15px] font-medium tabular-nums",
                "auge" in p && p.auge ? "bg-[var(--pin-auge)] text-white" : "bg-text text-bg",
              )}
            >
              {p.dias}
            </motion.span>
          ))}
        </AnimatePresence>
      </div>

      <ul className="flex flex-col gap-1.5 text-[15px]">
        {atual.paradas.map((p) => (
          <li key={`${ritmo}-${p.nome}`} className="flex justify-between gap-4">
            <span className={cn("auge" in p && p.auge && "font-medium")}>{p.nome}</span>
            <span className="tabular-nums text-text-2">
              {p.dias} dias
            </span>
          </li>
        ))}
      </ul>
      <p className="text-[15px] text-text-2" aria-live="polite">
        {atual.resumo}
      </p>
    </div>
  );
}
