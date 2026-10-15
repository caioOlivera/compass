"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { aprovarFonte } from "@/app/actions/base";

/** Botão do cartão da fonte: aprova tudo que não tem aviso, sem abrir a fila. */
export function AprovarFonte({ ingestaoId }: { ingestaoId: string }) {
  const router = useRouter();
  const [msg, setMsg] = useState("");
  const [ocupado, iniciar] = useTransition();
  return (
    <span className="flex items-center gap-2">
      <button
        type="button"
        disabled={ocupado}
        onClick={() =>
          iniciar(async () => {
            const r = await aprovarFonte(ingestaoId);
            setMsg(r.erros.length ? `${r.aprovados} ok, ${r.erros.length} com erro` : `${r.aprovados} aprovados`);
            router.refresh();
          })
        }
        className="rounded-md border border-border px-2.5 py-1 text-xs font-medium text-accent-strong hover:border-accent disabled:opacity-50"
      >
        {ocupado ? "Aprovando…" : "Aprovar tudo"}
      </button>
      {msg && <span className="text-xs text-text-2">{msg}</span>}
    </span>
  );
}
