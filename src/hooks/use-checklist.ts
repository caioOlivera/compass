"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { alternarItem } from "@/lib/itinerary/map";
import type { ChecklistState } from "@/lib/validation/itinerary";

export type StatusSalvamento = "ocioso" | "salvando" | "salvo" | "erro";

const ATRASO_MS = 600;

/**
 * Checklist com atualização otimista: marca na hora e salva no servidor depois de uma pausa,
 * juntando cliques seguidos num único PATCH. Sem itineraryId (página de exemplo), fica só local.
 */
export function useChecklist(inicial: ChecklistState, itineraryId?: string) {
  const [estado, setEstado] = useState(inicial);
  const [status, setStatus] = useState<StatusSalvamento>("ocioso");
  const ultimo = useRef(inicial);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const salvar = useCallback(
    async (checklist: ChecklistState, keepalive = false) => {
      if (!itineraryId) return;
      setStatus("salvando");
      try {
        const res = await fetch(`/api/itineraries/${itineraryId}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ checklist_state: checklist }),
          keepalive,
        });
        setStatus(res.ok ? "salvo" : "erro");
      } catch {
        setStatus("erro");
      }
    },
    [itineraryId],
  );

  const alternar = useCallback(
    (idPonto: string, indice: number) => {
      const novo = alternarItem(ultimo.current, idPonto, indice);
      ultimo.current = novo;
      setEstado(novo);
      if (!itineraryId) return;
      setStatus("salvando");
      if (timer.current) clearTimeout(timer.current);
      timer.current = setTimeout(() => {
        timer.current = null;
        void salvar(ultimo.current);
      }, ATRASO_MS);
    },
    [itineraryId, salvar],
  );

  // Saiu da página com alteração pendente: envia mesmo assim (keepalive sobrevive à navegação).
  useEffect(
    () => () => {
      if (timer.current) {
        clearTimeout(timer.current);
        void salvar(ultimo.current, true);
      }
    },
    [salvar],
  );

  return { estado, alternar, status, tentarDeNovo: () => salvar(ultimo.current) };
}
