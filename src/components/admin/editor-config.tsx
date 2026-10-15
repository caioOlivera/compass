"use client";

import { useState, useTransition } from "react";
import { salvarConfig } from "@/app/actions/config";
import { Button } from "@/components/ui/button";

export function EditorConfig({ chave, valor }: { chave: string; valor: string }) {
  const [texto, setTexto] = useState(valor);
  const [msg, setMsg] = useState("");
  const [ocupado, iniciar] = useTransition();
  const mudou = texto !== valor;
  return (
    <div className="flex flex-col gap-2">
      <textarea
        value={texto}
        onChange={(e) => setTexto(e.target.value)}
        rows={Math.min(14, texto.split("\n").length + 1)}
        spellCheck={false}
        className="w-full rounded-lg border border-border bg-bg p-3 font-mono text-xs"
        aria-label={`Valor de ${chave}`}
      />
      <div className="flex items-center gap-3">
        <Button
          variante="secundario"
          className="h-9"
          disabled={!mudou}
          carregando={ocupado}
          onClick={() => iniciar(async () => setMsg((await salvarConfig(chave, texto)).erro ?? "Salvo."))}
        >
          Salvar
        </Button>
        {msg && <span className="text-xs text-text-2">{msg}</span>}
      </div>
    </div>
  );
}
