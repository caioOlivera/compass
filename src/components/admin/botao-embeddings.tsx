"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { gerarEmbeddingsPendentes } from "@/app/actions/base";
import { Button } from "@/components/ui/button";

export function BotaoEmbeddings({ pendentes }: { pendentes: number }) {
  const router = useRouter();
  const [msg, setMsg] = useState("");
  const [ocupado, iniciar] = useTransition();
  if (!pendentes && !msg) return <p className="text-sm text-text-3">Todos os registros estão indexados.</p>;
  return (
    <div className="flex flex-col items-end gap-1">
      <Button
        variante="secundario"
        carregando={ocupado}
        onClick={() =>
          iniciar(async () => {
            const r = await gerarEmbeddingsPendentes();
            setMsg(r.erro ? `Erro: ${r.erro}` : `${r.indexados} registros indexados.`);
            router.refresh();
          })
        }
      >
        Gerar embeddings ({pendentes} pendentes)
      </Button>
      {msg && <p className="text-xs text-text-2">{msg}</p>}
    </div>
  );
}
