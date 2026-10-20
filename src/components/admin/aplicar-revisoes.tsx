"use client";

import { Sparkles } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { aplicarRevisoesPendentes } from "@/app/actions/roteiros-base";
import { Button } from "@/components/ui/button";

/** Aviso no topo da lista: revisões sugeridas prontas para aplicar com um clique. */
export function AplicarRevisoes({ titulos }: { titulos: string[] }) {
  const router = useRouter();
  const [msg, setMsg] = useState("");
  const [ocupado, iniciar] = useTransition();
  return (
    <div className="flex flex-col gap-3 rounded-xl border border-accent/40 bg-accent/5 p-4 text-sm">
      <p className="flex items-center gap-2 font-medium">
        <Sparkles className="size-4 text-accent-strong" aria-hidden />
        {titulos.length === 1 ? "1 revisão sugerida pronta" : `${titulos.length} revisões sugeridas prontas`}
      </p>
      <ul className="list-disc pl-5 text-text-2">
        {titulos.map((t) => (
          <li key={t}>{t}</li>
        ))}
      </ul>
      <div className="flex flex-wrap items-center gap-3">
        <Button
          type="button"
          carregando={ocupado}
          className="h-10"
          onClick={() =>
            iniciar(async () => {
              const r = await aplicarRevisoesPendentes();
              setMsg(r.mensagem);
              router.refresh();
            })
          }
        >
          Aplicar todas
        </Button>
        <span className="text-text-2">{msg || "Ou abra cada roteiro abaixo para revisar antes de salvar."}</span>
      </div>
    </div>
  );
}
