"use client";

import { useState, useTransition } from "react";
import { rodarEstudoHoteis, rodarEstudoVoos } from "@/app/actions/estudo";
import { Button } from "@/components/ui/button";

export function BotoesEstudo({ serpapi }: { serpapi: boolean }) {
  const [msg, setMsg] = useState("");
  const [ocupado, iniciar] = useTransition();
  const rodar = (f: () => Promise<{ ok: boolean; mensagem: string }>) =>
    iniciar(async () => {
      setMsg("Rodando… pode levar até 2 minutos.");
      setMsg((await f()).mensagem);
    });
  return (
    <div className="flex flex-col gap-2">
      <div className="flex flex-wrap gap-2">
        <Button type="button" carregando={ocupado} onClick={() => rodar(() => rodarEstudoVoos(false))}>
          Rodar 20 rotas (Travelpayouts)
        </Button>
        {serpapi && (
          <Button type="button" variante="secundario" disabled={ocupado} onClick={() => rodar(() => rodarEstudoVoos(true))}>
            Rodar com Google Flights (gasta 20 buscas SerpApi)
          </Button>
        )}
        {serpapi && (
          <Button type="button" variante="secundario" disabled={ocupado} onClick={() => rodar(rodarEstudoHoteis)}>
            Rodar hotéis (5 buscas SerpApi)
          </Button>
        )}
      </div>
      {msg && <p className="text-sm text-text-2">{msg}</p>}
    </div>
  );
}
